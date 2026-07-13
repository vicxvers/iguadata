#!/usr/bin/env python3
"""
Genera json/concentracio.json a partir dels contractes, empreses classificades
i administradors mercantils ja filtrats per Iguadata.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

from atomic_io import write_json_atomic
from contract_filters import is_analysis_contract


BASE_DIR = Path(__file__).resolve().parents[2]
CONTRACTES_FILE = BASE_DIR / "json" / "contractes.json"
EMPRESES_FILE = BASE_DIR / "json" / "empreses.json"
ADMIN_FILE = BASE_DIR / "json" / "carrecs.json"
OUTPUT_FILE = BASE_DIR / "json" / "concentracio.json"

MIN_SECTOR_CONTRACTS = 5
MIN_SECTOR_COMPANIES = 3
MAX_ADMIN_COMPANIES = 25
MIN_TEMPORAL_COMPANY_CONTRACTS = 4
MIN_TEMPORAL_SECTOR_CONTRACTS = 6
MIN_TEMPORAL_CONTRACT_SHARE = 0.45

TEMPORAL_WINDOWS = [30, 90, 180]


def fold(value: str) -> str:
    value = (value or "").upper().replace("Ñ", "##ENIE##")
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return value.replace("##ENIE##", "Ñ")


def norm_company(value: str) -> str:
    value = fold(value)
    value = re.sub(r"\b(SOCIEDAD|LIMITADA|ANONIMA|UNIPERSONAL|SLU|S\.L\.U\.|S\.L\.|SL|SA|S\.A\.|SAU|S\.A\.U\.)\b", "", value)
    value = re.sub(r"[^A-ZÑ0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def parse_date(value: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def stable_contract_key(c: dict) -> str:
    code = re.sub(r"\s+", " ", str(c.get("codigo") or "")).strip()
    if code:
        parts = [code, c.get("fecha"), c.get("importe")]
    else:
        parts = [c.get("fecha"), c.get("importe"), c.get("adjudicatario")]
    return "|".join("" if v is None else str(v).strip() for v in parts)


def stable_case_id(prefix: str, *parts: object) -> str:
    signature = "|".join("" if part is None else str(part).strip() for part in parts)
    digest = hashlib.sha1(signature.encode("utf-8")).hexdigest()[:10].upper()
    return f"{prefix}-{digest}"


def risk_label(score: int) -> str:
    if score >= 85:
        return "CRITIC"
    if score >= 65:
        return "ALT"
    if score >= 40:
        return "OBSERVACIO"
    return "BAIX"


def build_company_meta(empreses: list[dict]) -> dict[str, dict]:
    meta = {}
    for emp in empreses:
        key = norm_company(emp.get("nom", ""))
        if key:
            meta[key] = {
                "nom": emp.get("nom", ""),
                "sector": emp.get("sector") or "Altres Serveis i Subministraments",
                "categoria": emp.get("categoria") or "Altres serveis comunitaris",
            }
    return meta


def enrich_contract(c: dict, company_meta: dict[str, dict]) -> dict | None:
    company_norm = norm_company(c.get("adjudicatario", ""))
    if company_norm in {"LOT DESERT", "DESERT", "SENSE ADJUDICATARI"}:
        return None
    meta = company_meta.get(company_norm)
    d = parse_date(c.get("fecha", ""))
    if not company_norm or not meta or not d:
        return None
    clean = dict(c)
    clean["_date"] = d
    clean["_company_norm"] = company_norm
    clean["_sector"] = meta["sector"]
    clean["_categoria"] = meta["categoria"]
    return clean


def build_admin_links(administradors: dict) -> dict[str, set[str]]:
    by_admin = defaultdict(set)
    for empresa, rows in administradors.items():
        empresa_norm = norm_company(empresa)
        if not empresa_norm:
            continue
        for row in rows or []:
            if row.get("tipo_entidad") == "empresa":
                continue
            admin = fold(row.get("nombre", ""))
            admin = re.sub(r"[^A-ZÑ0-9]+", " ", admin).strip()
            if admin:
                by_admin[admin].add(empresa_norm)
    return {
        admin: companies
        for admin, companies in by_admin.items()
        if 1 < len(companies) <= MAX_ADMIN_COMPANIES
    }


def connected_components(companies: set[str], admin_links: dict[str, set[str]]) -> list[tuple[set[str], list[str]]]:
    parent = {c: c for c in companies}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    admins_by_root = defaultdict(set)
    for admin, linked in admin_links.items():
        present = sorted(linked & companies)
        if len(present) < 2:
            continue
        first = present[0]
        for other in present[1:]:
            union(first, other)

    for admin, linked in admin_links.items():
        present = sorted(linked & companies)
        if len(present) >= 2:
            admins_by_root[find(present[0])].add(admin)

    comps = defaultdict(set)
    for company in companies:
        comps[find(company)].add(company)
    return [
        (members, sorted(admins_by_root[root]))
        for root, members in comps.items()
        if len(members) > 1 and admins_by_root[root]
    ]


def score_case(case: dict) -> tuple[int, list[str]]:
    quota = case["quota_import"]
    quota_contractes = case["quota_contractes"]
    hhi = case["hhi"]
    amount = case["import_concentrat"]
    persistent = case["finestra"] in {"historic", "4y"}
    is_network = case["tipus_concentracio"] == "xarxa"

    score = 0
    motius = []
    if quota >= 0.70:
        score += 35
        motius.append("Quota econòmica molt alta dins del sector")
    elif quota >= 0.50:
        score += 28
        motius.append("Quota econòmica alta dins del sector")
    elif quota >= 0.35:
        score += 18
        motius.append("Quota econòmica rellevant dins del sector")

    if quota_contractes >= 0.50:
        score += 18
        motius.append("Recurrència contractual elevada")
    elif quota_contractes >= 0.30:
        score += 10
        motius.append("Recurrència contractual significativa")

    if hhi >= 2500:
        score += 18
        motius.append("Sector altament concentrat segons HHI")
    elif hhi >= 1800:
        score += 10
        motius.append("Sector moderadament concentrat segons HHI")

    if is_network:
        score += 14
        motius.append("Concentració acumulada per xarxa mercantil")
    if persistent:
        score += 8
        motius.append("Patró observat en una finestra temporal estructural")
    if amount >= 100000:
        score += 7
        motius.append("Import acumulat rellevant")
    elif amount >= 50000:
        score += 4
        motius.append("Import acumulat significatiu")

    return min(score, 100), motius


def score_temporal_case(case: dict) -> tuple[int, list[str]]:
    count = case["contractes_concentrats"]
    quota_contractes = case["quota_contractes"]
    quota_import = case["quota_import"]
    days = max(1, case.get("dies_finestra") or 1)
    rhythm = case.get("ritme_relatiu") or 0
    amount = case["import_concentrat"]

    score = 0
    motius = []
    if count >= 8:
        score += 25
        motius.append("Volum molt alt de contractes en poc temps")
    elif count >= 5:
        score += 18
        motius.append("Volum alt de contractes en poc temps")
    elif count >= 3:
        score += 10
        motius.append("Diversos contractes adjudicats en una mateixa finestra temporal")

    if quota_contractes >= 0.70:
        score += 25
        motius.append("Quota molt alta dels contractes del sector en la finestra")
    elif quota_contractes >= 0.50:
        score += 18
        motius.append("Quota alta dels contractes del sector en la finestra")
    elif quota_contractes >= 0.35:
        score += 10
        motius.append("Quota rellevant dels contractes del sector en la finestra")

    if quota_import >= 0.70:
        score += 18
        motius.append("Quota econòmica molt alta dins la finestra")
    elif quota_import >= 0.50:
        score += 12
        motius.append("Quota econòmica alta dins la finestra")
    elif quota_import >= 0.35:
        score += 6
        motius.append("Quota econòmica rellevant dins la finestra")

    if days <= 30:
        score += 20
        motius.append("Acumulació concentrada en menys de 30 dies")
    elif days <= 90:
        score += 15
        motius.append("Acumulació concentrada en menys de 90 dies")
    elif days <= 180:
        score += 10
        motius.append("Acumulació concentrada en menys de 180 dies")
    else:
        score += 5
        motius.append("Acumulació dins una finestra anual")

    if rhythm >= 4:
        score += 14
        motius.append("Ritme d'adjudicació molt superior al patró històric de l'empresa")
    elif rhythm >= 2.5:
        score += 9
        motius.append("Ritme d'adjudicació superior al patró històric de l'empresa")

    if amount >= 100000:
        score += 5
        motius.append("Import acumulat rellevant")
    elif amount >= 50000:
        score += 3
        motius.append("Import acumulat significatiu")

    return min(score, 100), motius


def sector_stats(rows: list[dict]) -> dict:
    by_company = defaultdict(lambda: {"import": 0.0, "contracts": 0, "rows": []})
    for c in rows:
        item = by_company[c["_company_norm"]]
        item["import"] += float(c.get("importe") or 0)
        item["contracts"] += 1
        item["rows"].append(c)

    total_amount = sum(v["import"] for v in by_company.values())
    total_contracts = sum(v["contracts"] for v in by_company.values())
    shares = sorted((v["import"] / total_amount for v in by_company.values()), reverse=True) if total_amount else []
    return {
        "by_company": by_company,
        "total_amount": total_amount,
        "total_contracts": total_contracts,
        "companies_count": len(by_company),
        "cr1": shares[0] if shares else 0,
        "cr3": sum(shares[:3]),
        "hhi": round(sum((s * 100) ** 2 for s in shares)),
    }


def temporal_label(start: date, end: date, days: int) -> str:
    if days <= 30:
        label = "30 dies"
    elif days <= 90:
        label = "90 dies"
    elif days <= 180:
        label = "180 dies"
    else:
        label = "365 dies"
    return f"{start.isoformat()} → {end.isoformat()} · {label}"


def overlap_ratio(a: dict, b: dict) -> float:
    a0, a1 = date.fromisoformat(a["data_inici"]), date.fromisoformat(a["data_fi"])
    b0, b1 = date.fromisoformat(b["data_inici"]), date.fromisoformat(b["data_fi"])
    start = max(a0, b0)
    end = min(a1, b1)
    if end < start:
        return 0.0
    inter = (end - start).days + 1
    shortest = min((a1 - a0).days + 1, (b1 - b0).days + 1)
    return inter / shortest if shortest else 0.0


def build_temporal_cases(rows: list[dict], company_meta: dict[str, dict]) -> list[dict]:
    by_sector = defaultdict(list)
    for c in rows:
        by_sector[c["_sector"]].append(c)

    candidates = []
    for sector, sector_rows in by_sector.items():
        sector_rows = sorted(sector_rows, key=lambda c: c["_date"])
        by_company = defaultdict(list)
        for c in sector_rows:
            by_company[c["_company_norm"]].append(c)

        for company, company_rows in by_company.items():
            if len(company_rows) < MIN_TEMPORAL_COMPANY_CONTRACTS:
                continue
            company_rows = sorted(company_rows, key=lambda c: c["_date"])
            hist_first, hist_last = company_rows[0]["_date"], company_rows[-1]["_date"]
            hist_span_days = max(1, (hist_last - hist_first).days + 1)

            for days in TEMPORAL_WINDOWS:
                best = None
                for i, start_row in enumerate(company_rows):
                    start = start_row["_date"]
                    end_limit = start + timedelta(days=days)
                    selected = [c for c in company_rows[i:] if c["_date"] <= end_limit]
                    if len(selected) < MIN_TEMPORAL_COMPANY_CONTRACTS:
                        continue
                    end = selected[-1]["_date"]
                    sector_window = [c for c in sector_rows if start <= c["_date"] <= end]
                    if len(sector_window) < MIN_TEMPORAL_SECTOR_CONTRACTS:
                        continue

                    stats = sector_stats(sector_window)
                    company_amount = sum(float(c.get("importe") or 0) for c in selected)
                    company_contracts = len(selected)
                    quota_contracts = company_contracts / stats["total_contracts"] if stats["total_contracts"] else 0
                    if quota_contracts < MIN_TEMPORAL_CONTRACT_SHARE and company_contracts < 5:
                        continue

                    actual_days = max(1, (end - start).days + 1)
                    expected = len(company_rows) * (actual_days / hist_span_days)
                    rhythm = round(company_contracts / expected, 2) if expected else 0
                    base = {
                        "tipus_alerta": "concentracio",
                        "sector": sector,
                        "finestra": f"temporal_{days}d",
                        "finestra_label": temporal_label(start, end, days),
                        "dies_finestra": actual_days,
                        "ritme_relatiu": rhythm,
                        "import_sector": round(stats["total_amount"], 2),
                        "contractes_sector": stats["total_contracts"],
                        "empreses_sector": stats["companies_count"],
                        "cr1": round(stats["cr1"], 4),
                        "cr3": round(stats["cr3"], 4),
                        "hhi": stats["hhi"],
                    }
                    case = build_case(
                        base,
                        company,
                        selected,
                        company_amount,
                        company_contracts,
                        "empresa",
                        [],
                        company_meta,
                        scorer=score_temporal_case,
                    )
                    if case["risc"] < 65:
                        continue
                    if best is None or (case["risc"], case["contractes_concentrats"], case["import_concentrat"]) > (best["risc"], best["contractes_concentrats"], best["import_concentrat"]):
                        best = case
                if best:
                    candidates.append(best)

    selected_cases = []
    for case in sorted(candidates, key=lambda c: (-c["risc"], -c["contractes_concentrats"], -c["import_concentrat"])):
        duplicate = False
        for existing in selected_cases:
            if case["sector"] == existing["sector"] and case["empreses"] == existing["empreses"] and overlap_ratio(case, existing) >= 0.70:
                duplicate = True
                break
        if not duplicate:
            selected_cases.append(case)
    return selected_cases


def build_case(base: dict, entity_key: str, entity_rows: list[dict], entity_amount: float, entity_contracts: int, kind: str, admins: list[str], company_meta: dict[str, dict], scorer=score_case) -> dict:
    first = min(c["_date"] for c in entity_rows)
    last = max(c["_date"] for c in entity_rows)
    companies = sorted({c["_company_norm"] for c in entity_rows})
    case = {
        **base,
        "tipus_concentracio": kind,
        "entity_key": entity_key,
        "empreses": [company_meta.get(c, {}).get("nom", c) for c in companies],
        "empresa_dominant": company_meta.get(companies[0], {}).get("nom", companies[0]) if len(companies) == 1 else "",
        "administradors_comuns": admins[:8],
        "import_concentrat": round(entity_amount, 2),
        "contractes_concentrats": entity_contracts,
        "quota_import": round(entity_amount / base["import_sector"], 4) if base["import_sector"] else 0,
        "quota_contractes": round(entity_contracts / base["contractes_sector"], 4) if base["contractes_sector"] else 0,
        "data_inici": first.isoformat(),
        "data_fi": last.isoformat(),
        "contractes": [
            {
                "id": c.get("id"),
                "codigo": c.get("codigo"),
                "descripcion": c.get("descripcion"),
                "adjudicatario": c.get("adjudicatario"),
                "importe": c.get("importe"),
                "fecha": c.get("fecha"),
                "tipo": c.get("tipo"),
                "procedimiento": c.get("procedimiento"),
                "cpv": c.get("cpv", ""),
                "estat_font": c.get("estat_font", "actiu_socrata"),
                "preservat_iguadata": bool(c.get("preservat_iguadata")),
                "primera_absencia_detectada": c.get("primera_absencia_detectada", ""),
                "font_preservacio": c.get("font_preservacio", ""),
                "primer_snapshot_iguadata": c.get("primer_snapshot_iguadata", ""),
            }
            for c in sorted(entity_rows, key=lambda x: (x["_date"], x.get("id") or 0), reverse=True)
        ][:75],
    }
    score, motius = scorer(case)
    case["risc"] = score
    case["nivell"] = risk_label(score)
    case["motius"] = motius[:8]
    return case


def build_cases(contractes: list[dict], empreses: list[dict], administradors: dict) -> list[dict]:
    company_meta = build_company_meta(empreses)
    rows = [c for c in (enrich_contract(c, company_meta) for c in contractes) if c]
    if not rows:
        return []

    admin_links = build_admin_links(administradors)
    cases = []
    seen = set()

    by_sector = defaultdict(list)
    for c in rows:
        by_sector[c["_sector"]].append(c)

    for sector, sector_rows in by_sector.items():
        stats = sector_stats(sector_rows)
        if stats["total_contracts"] < MIN_SECTOR_CONTRACTS or stats["companies_count"] < MIN_SECTOR_COMPANIES:
            continue

        top_company, top_data = max(stats["by_company"].items(), key=lambda item: item[1]["import"])
        base = {
            "tipus_alerta": "concentracio",
            "sector": sector,
            "finestra": "historic",
            "finestra_label": "Històric complet",
            "import_sector": round(stats["total_amount"], 2),
            "contractes_sector": stats["total_contracts"],
            "empreses_sector": stats["companies_count"],
            "cr1": round(stats["cr1"], 4),
            "cr3": round(stats["cr3"], 4),
            "hhi": stats["hhi"],
        }
        individual = build_case(
            base,
            top_company,
            top_data["rows"],
            top_data["import"],
            top_data["contracts"],
            "empresa",
            [],
            company_meta,
        )
        if individual["risc"] < 40:
            individual["motius"].append("Empresa amb major pes relatiu dins del sector")
        cases.append(individual)

        for members, admins in connected_components(set(stats["by_company"].keys()), admin_links):
            network_rows = []
            network_amount = 0.0
            network_contracts = 0
            for company in members:
                item = stats["by_company"][company]
                network_rows.extend(item["rows"])
                network_amount += item["import"]
                network_contracts += item["contracts"]
            if network_amount <= top_data["import"] * 1.05:
                continue
            network = build_case(
                base,
                "|".join(sorted(members)),
                network_rows,
                network_amount,
                network_contracts,
                "xarxa",
                admins,
                company_meta,
            )
            if network["risc"] >= 40:
                sig = ("historic", sector, tuple(sorted(members)))
                if sig not in seen:
                    seen.add(sig)
                    cases.append(network)

    cases.extend(build_temporal_cases(rows, company_meta))

    cases = sorted(cases, key=lambda c: (-c["risc"], -c["import_concentrat"], c["sector"], c["finestra"]))
    for case in cases:
        contract_keys = ",".join(sorted(stable_contract_key(c) for c in case["contractes"]))
        case["id"] = stable_case_id(
            "CO",
            case.get("tipus_concentracio"),
            case.get("sector"),
            case.get("finestra"),
            case.get("entity_key"),
            case.get("data_inici"),
            case.get("data_fi"),
            contract_keys,
        )
        case.pop("entity_key", None)
    return cases


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contractes", type=Path, default=CONTRACTES_FILE)
    parser.add_argument("--empreses", type=Path, default=EMPRESES_FILE)
    parser.add_argument("--administradors", type=Path, default=ADMIN_FILE)
    parser.add_argument("--output", type=Path, default=OUTPUT_FILE)
    args = parser.parse_args()

    with args.contractes.open("r", encoding="utf-8") as f:
        contractes = json.load(f)
    with args.empreses.open("r", encoding="utf-8") as f:
        empreses = json.load(f)
    with args.administradors.open("r", encoding="utf-8") as f:
        administradors = json.load(f)

    contractes = [c for c in contractes if is_analysis_contract(c)]
    cases = build_cases(contractes, empreses, administradors)
    payload = {
        "metodologia": "concentracio_v1",
        "generat_a": date.today().isoformat(),
        "total_alertes": len(cases),
        "alertes": cases,
    }
    write_json_atomic(args.output, payload)
    print(f"concentracio.json: {len(cases)} alertes")


if __name__ == "__main__":
    main()
