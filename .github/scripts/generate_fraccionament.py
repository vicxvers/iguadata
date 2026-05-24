#!/usr/bin/env python3
"""
Genera json/fraccionament.json a partir dels contractes menors i els
administradors mercantils ja filtrats per Iguadata.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
CONTRACTES_FILE = BASE_DIR / "json" / "contractes.json"
ADMIN_FILE = BASE_DIR / "json" / "carrecs.json"
OUTPUT_FILE = BASE_DIR / "json" / "fraccionament.json"

TEMPORAL_WINDOW_DAYS = 365
MIN_SIMILARITY = 0.50
MAX_ADMIN_COMPANIES = 25
SINGLE_CONTRACT_NEAR_LIMIT_RATIO = 0.95
MULTIANNUAL_NEAR_LIMIT_RATIO = 0.85
MULTIANNUAL_MIN_SIMILARITY = 0.78

STOPWORDS = {
    "a", "amb", "de", "del", "dels", "el", "els", "en", "i", "la", "les", "per",
    "un", "una", "uns", "unes", "al", "als", "l", "d", "que", "pel", "pels",
    "contractacio", "contracte", "servei", "serveis", "subministrament",
    "subministraments", "obra", "obres", "ajuntament", "igualada", "municipal",
    "corresponent", "any", "realitzacio", "execucio", "adquisicio",
}

TOKEN_RE = re.compile(r"[a-z0-9]{3,}")


def fold(value: str) -> str:
    value = (value or "").upper().replace("Ñ", "##ENIE##")
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return value.replace("##ENIE##", "Ñ")


def norm_company(value: str) -> str:
    value = fold(value)
    value = re.sub(r"\b(SOCIEDAD|LIMITADA|ANONIMA|UNIPERSONAL|SLU|S\.L\.U\.|S\.L\.|SL|SA|S\.A\.|SAU|S\.A\.U\.)\b", "", value)
    value = re.sub(r"[^A-Z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def tokens(text: str) -> set[str]:
    folded = fold(text).lower()
    folded = re.sub(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", " ", folded)
    folded = re.sub(r"\b20\d{2}\b", " ", folded)
    return {t for t in TOKEN_RE.findall(folded) if t not in STOPWORDS}


def similarity(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    if inter == 0:
        return 0.0
    return inter / math.sqrt(len(a) * len(b))


def parse_date(value: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def contract_type(value: str) -> str:
    v = fold(value)
    if "OBRES" in v:
        return "obres"
    if "SUBMINISTR" in v:
        return "subministraments"
    return "serveis"


def legal_limit(kind: str) -> int:
    return 40000 if kind == "obres" else 15000


def risk_label(score: int) -> str:
    if score >= 85:
        return "CRITIC"
    if score >= 65:
        return "ALT"
    if score >= 40:
        return "OBSERVACIO"
    return "BAIX"


def is_minor(c: dict) -> bool:
    proc = fold(c.get("procedimiento", ""))
    return "MENOR" in proc and not re.search(r"\bNO\s+MENOR", proc)


def enrich_contract(c: dict) -> dict:
    clean = dict(c)
    clean["_date"] = parse_date(c.get("fecha", ""))
    clean["_tokens"] = tokens(c.get("descripcion", ""))
    clean["_company_norm"] = norm_company(c.get("adjudicatario", ""))
    clean["_kind"] = contract_type(c.get("tipo", ""))
    clean["_cpv2"] = re.sub(r"\D", "", str(c.get("cpv", "")))[:2]
    return clean


def expediente_key(c: dict) -> str:
    code = re.sub(r"\s+", " ", str(c.get("codigo") or "")).strip()
    return code or f"id:{c.get('id')}"


def dedupe_expedients(rows: list[dict]) -> list[dict]:
    by_key: dict[str, dict] = {}
    for c in sorted(rows, key=lambda x: (x["_date"] or date.max, x.get("id") or 0)):
        key = expediente_key(c)
        if key not in by_key:
            by_key[key] = c
    return list(by_key.values())


def contract_summary(c: dict) -> dict:
    return {
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


def amount_value(c: dict) -> float:
    return float(c.get("importe") or 0)


def is_near_limit(c: dict, ratio: float) -> bool:
    limit = legal_limit(c["_kind"])
    amount = amount_value(c)
    return amount > 0 and amount >= limit * ratio


def is_round_or_threshold_amount(c: dict) -> bool:
    amount = amount_value(c)
    if amount <= 0 or abs(amount - round(amount)) >= 0.01:
        return False
    whole = int(round(amount))
    limit = legal_limit(c["_kind"])
    if amount >= limit * 0.90 and whole % 50 == 0:
        return True
    if whole >= 5000 and whole % 5000 == 0:
        return True
    if amount >= limit * 0.75 and whole % 1000 == 0:
        return True
    return False


def has_round_amount_signal(contracts: list[dict]) -> bool:
    hits = sum(1 for c in contracts if is_round_or_threshold_amount(c))
    return hits >= (1 if len(contracts) == 1 else 2)


def build_admin_groups(administradors: dict) -> dict[str, set[str]]:
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


def pair_reasons(a: dict, b: dict, admin_name: str | None) -> tuple[bool, float, int, list[str]]:
    if not a["_date"] or not b["_date"]:
        return False, 0.0, 9999, []
    days = abs((a["_date"] - b["_date"]).days)
    if days > TEMPORAL_WINDOW_DAYS:
        return False, 0.0, days, []

    sim = similarity(a["_tokens"], b["_tokens"])
    same_cpv = bool(a["_cpv2"] and a["_cpv2"] == b["_cpv2"])
    same_company = a["_company_norm"] == b["_company_norm"]
    same_amount = abs(float(a.get("importe") or 0) - float(b.get("importe") or 0)) < 0.01
    if same_company and days <= 1 and same_amount and sim >= 0.70:
        return False, sim, days, []
    compatible_object = sim >= MIN_SIMILARITY or (same_cpv and sim >= 0.35)
    if not compatible_object:
        return False, sim, days, []

    reasons = []
    if same_company:
        reasons.append("Mateixa empresa adjudicatària")
    elif admin_name:
        reasons.append("Empreses connectades per administrador comú")
    if sim >= 0.80:
        reasons.append("Objecte amb similitud molt alta")
    elif sim >= 0.65:
        reasons.append("Objecte amb similitud alta")
    else:
        reasons.append("Objecte compatible o parcialment similar")
    if same_cpv:
        reasons.append("Mateixa divisió CPV")
    if days <= 30:
        reasons.append("Adjudicacions en menys de 30 dies")
    elif days <= 90:
        reasons.append("Adjudicacions en menys de 90 dies")
    elif days <= 180:
        reasons.append("Adjudicacions en menys de 180 dies")
    else:
        reasons.append("Adjudicacions dins la finestra anual")
    return True, sim, days, reasons


def connected_components(nodes: list[int], edges: list[tuple[int, int]]) -> list[list[int]]:
    parent = {n: n for n in nodes}

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for a, b in edges:
        union(a, b)
    comps = defaultdict(list)
    for n in nodes:
        comps[find(n)].append(n)
    return [c for c in comps.values() if len(c) > 1]


def score_case(contracts: list[dict], avg_sim: float, min_days: int, shared_admins: list[str]) -> tuple[int, list[str]]:
    kinds = {c["_kind"] for c in contracts}
    kind = "obres" if kinds == {"obres"} else "serveis"
    limit = legal_limit(kind)
    total = sum(float(c.get("importe") or 0) for c in contracts)
    max_single = max(float(c.get("importe") or 0) for c in contracts)

    score = 0
    motius = []
    companies = {c["_company_norm"] for c in contracts}
    if len(companies) == 1:
        score += 25
        motius.append("Contractes menors amb la mateixa empresa adjudicatària")
    elif shared_admins:
        score += 18
        motius.append("Contractes amb empreses vinculades per administradors comuns")

    if avg_sim >= 0.80:
        score += 25
        motius.append("Objectes contractuals amb similitud mitjana molt alta")
    elif avg_sim >= 0.65:
        score += 18
        motius.append("Objectes contractuals amb similitud mitjana alta")
    else:
        score += 10
        motius.append("Objectes contractuals compatibles")

    if min_days <= 30:
        score += 20
        motius.append("Proximitat temporal inferior a 30 dies")
    elif min_days <= 90:
        score += 16
        motius.append("Proximitat temporal inferior a 90 dies")
    elif min_days <= 180:
        score += 10
        motius.append("Proximitat temporal inferior a 180 dies")
    else:
        score += 5
        motius.append("Proximitat temporal dins la finestra anual")

    if total > limit:
        score += 25
        motius.append("Import acumulat superior al límit legal del contracte menor")
    elif total >= limit * 0.85:
        score += 18
        motius.append("Import acumulat proper al límit legal del contracte menor")
    elif max_single >= limit * 0.75:
        score += 8
        motius.append("Almenys una fracció queda prop del límit individual")

    if has_round_amount_signal(contracts):
        score += 5
        motius.append("Imports rodons o ajustats al llindar")

    cpvs = [c["_cpv2"] for c in contracts if c["_cpv2"]]
    if cpvs and len(set(cpvs)) == 1:
        score += 10
        motius.append("Mateixa divisió CPV")

    return min(score, 100), motius


def build_cases(contractes: list[dict], administradors: dict) -> list[dict]:
    minors = [enrich_contract(c) for c in contractes if is_minor(c)]
    by_company = defaultdict(list)
    for c in minors:
        if c["_company_norm"] and c["_date"]:
            by_company[c["_company_norm"]].append(c)

    admin_groups = build_admin_groups(administradors)
    candidate_groups: list[tuple[str, list[dict], list[str]]] = []
    for company, rows in by_company.items():
        if len(rows) > 1:
            candidate_groups.append((f"empresa:{company}", rows, []))
    for admin, companies in admin_groups.items():
        rows = []
        for company in companies:
            rows.extend(by_company.get(company, []))
        if len(rows) > 1:
            candidate_groups.append((f"admin:{admin}", rows, [admin]))

    cases = []
    seen_signatures = set()
    used_expedients = set()
    for group_key, rows, shared_admins in candidate_groups:
        rows = sorted(dedupe_expedients(rows), key=lambda c: c["_date"])
        if len(rows) < 2:
            continue
        edges = []
        pair_data = {}
        for i, a in enumerate(rows):
            for j in range(i + 1, len(rows)):
                b = rows[j]
                ok, sim, days, reasons = pair_reasons(a, b, shared_admins[0] if shared_admins else None)
                if ok:
                    edges.append((i, j))
                    pair_data[(i, j)] = (sim, days, reasons)
        if not edges:
            continue

        for comp in connected_components(list(range(len(rows))), edges):
            selected = [rows[i] for i in comp]
            first = min(c["_date"] for c in selected)
            last = max(c["_date"] for c in selected)
            if (last - first).days > TEMPORAL_WINDOW_DAYS:
                continue
            ids = tuple(sorted(expediente_key(c) for c in selected))
            if ids in seen_signatures:
                continue
            seen_signatures.add(ids)
            used_expedients.update(ids)

            sims, days_list, pair_reasons_flat = [], [], []
            for a_i, a in enumerate(comp):
                for b in comp[a_i + 1:]:
                    key = (min(a, b), max(a, b))
                    if key in pair_data:
                        sim, days, reasons = pair_data[key]
                        sims.append(sim)
                        days_list.append(days)
                        pair_reasons_flat.extend(reasons)
            avg_sim = sum(sims) / len(sims) if sims else 0
            min_days = min(days_list) if days_list else TEMPORAL_WINDOW_DAYS
            score, motius = score_case(selected, avg_sim, min_days, shared_admins)
            if score < 40:
                continue

            kinds = {c["_kind"] for c in selected}
            limit_kind = "obres" if kinds == {"obres"} else "serveis"
            case_id = f"FR-{len(cases) + 1:04d}"
            cases.append({
                "id": case_id,
                "tipus_alerta": "fraccionament",
                "risc": score,
                "nivell": risk_label(score),
                "contractes_count": len(selected),
                "empreses": sorted({c.get("adjudicatario", "") for c in selected if c.get("adjudicatario")}),
                "administradors_comuns": shared_admins,
                "import_total": round(sum(float(c.get("importe") or 0) for c in selected), 2),
                "limit_legal": legal_limit(limit_kind),
                "tipus_limit": limit_kind,
                "dies_entre_primer_i_ultim": (last - first).days,
                "similitud_objecte": round(avg_sim, 3),
                "cpv_compartit": bool(selected[0]["_cpv2"] and all(c["_cpv2"] == selected[0]["_cpv2"] for c in selected)),
                "data_inici": first.isoformat(),
                "data_fi": last.isoformat(),
                "motius": list(dict.fromkeys(motius + pair_reasons_flat))[:8],
                "contractes": [
                    contract_summary(c)
                    for c in sorted(selected, key=lambda x: (x["_date"], x.get("id") or 0))
                ],
            })

    for company, company_rows in by_company.items():
        rows = sorted(dedupe_expedients(company_rows), key=lambda c: c["_date"] or date.max)
        if len(rows) < 2:
            continue
        edges = []
        pair_data = {}
        for i, a in enumerate(rows):
            for j in range(i + 1, len(rows)):
                b = rows[j]
                if not a["_date"] or not b["_date"] or a["_date"].year == b["_date"].year:
                    continue
                if a["_kind"] != b["_kind"]:
                    continue
                if not (is_near_limit(a, MULTIANNUAL_NEAR_LIMIT_RATIO) and is_near_limit(b, MULTIANNUAL_NEAR_LIMIT_RATIO)):
                    continue
                sim = similarity(a["_tokens"], b["_tokens"])
                same_cpv = bool(a["_cpv2"] and a["_cpv2"] == b["_cpv2"])
                if sim < MULTIANNUAL_MIN_SIMILARITY and not (same_cpv and sim >= 0.60):
                    continue
                days = abs((a["_date"] - b["_date"]).days)
                edges.append((i, j))
                pair_data[(i, j)] = (sim, days)
        if not edges:
            continue

        for comp in connected_components(list(range(len(rows))), edges):
            selected = [rows[i] for i in comp]
            years = {c["_date"].year for c in selected if c["_date"]}
            if len(years) < 2:
                continue
            ids = tuple(sorted(expediente_key(c) for c in selected))
            if ids in seen_signatures:
                continue
            seen_signatures.add(ids)
            used_expedients.update(ids)

            sims, days_list = [], []
            for a_i, a in enumerate(comp):
                for b in comp[a_i + 1:]:
                    key = (min(a, b), max(a, b))
                    if key in pair_data:
                        sim, days = pair_data[key]
                        sims.append(sim)
                        days_list.append(days)
            avg_sim = sum(sims) / len(sims) if sims else 0
            first = min(c["_date"] for c in selected)
            last = max(c["_date"] for c in selected)
            kinds = {c["_kind"] for c in selected}
            limit_kind = "obres" if kinds == {"obres"} else "serveis"
            ratios = [amount_value(c) / legal_limit(c["_kind"]) for c in selected if legal_limit(c["_kind"])]
            score = 45
            if avg_sim >= 0.90:
                score += 20
            elif avg_sim >= 0.80:
                score += 15
            if ratios and min(ratios) >= 0.95:
                score += 12
            else:
                score += 7
            cpvs = [c["_cpv2"] for c in selected if c["_cpv2"]]
            same_cpv_all = bool(cpvs and len(set(cpvs)) == 1)
            if same_cpv_all:
                score += 5
            motius = [
                "Repeticio multianual del mateix objecte",
                "Mateixa empresa adjudicataria",
                "Contractes en exercicis diferents",
                "Imports individuals propers al limit legal",
            ]
            if has_round_amount_signal(selected):
                score += 5
                motius.append("Imports rodons o ajustats al llindar")
            if same_cpv_all:
                motius.append("Mateixa divisio CPV")

            score = min(score, 100)
            cases.append({
                "id": f"FR-{len(cases) + 1:04d}",
                "tipus_alerta": "repeticio_multianual",
                "risc": score,
                "nivell": risk_label(score),
                "contractes_count": len(selected),
                "empreses": sorted({c.get("adjudicatario", "") for c in selected if c.get("adjudicatario")}),
                "administradors_comuns": [],
                "import_total": round(sum(amount_value(c) for c in selected), 2),
                "limit_legal": legal_limit(limit_kind),
                "tipus_limit": limit_kind,
                "dies_entre_primer_i_ultim": (last - first).days,
                "similitud_objecte": round(avg_sim, 3),
                "cpv_compartit": same_cpv_all,
                "data_inici": first.isoformat(),
                "data_fi": last.isoformat(),
                "motius": motius,
                "contractes": [
                    contract_summary(c)
                    for c in sorted(selected, key=lambda x: (x["_date"], x.get("id") or 0))
                ],
            })

    for c in dedupe_expedients(minors):
        key = expediente_key(c)
        if key in used_expedients or not c["_date"]:
            continue
        kind = c["_kind"]
        limit = legal_limit(kind)
        amount = float(c.get("importe") or 0)
        if amount <= 0:
            continue
        ratio = amount / limit
        if ratio < SINGLE_CONTRACT_NEAR_LIMIT_RATIO:
            continue

        if amount > limit:
            score = 70
            motius = ["Contracte menor superior al limit legal"]
        elif ratio >= 0.98:
            score = 55
            motius = ["Contracte menor molt proper al limit legal"]
        else:
            score = 42
            motius = ["Contracte menor proper al limit legal"]
        if has_round_amount_signal([c]):
            score = min(score + 5, 100)
            motius.append("Imports rodons o ajustats al llindar")

        cases.append({
            "id": f"FR-{len(cases) + 1:04d}",
            "tipus_alerta": "contracte_proper_limit",
            "risc": score,
            "nivell": risk_label(score),
            "contractes_count": 1,
            "empreses": [c.get("adjudicatario", "")] if c.get("adjudicatario") else [],
            "administradors_comuns": [],
            "import_total": round(amount, 2),
            "limit_legal": limit,
            "tipus_limit": kind,
            "dies_entre_primer_i_ultim": 0,
            "similitud_objecte": None,
            "cpv_compartit": False,
            "data_inici": c["_date"].isoformat(),
            "data_fi": c["_date"].isoformat(),
            "motius": motius,
            "contractes": [contract_summary(c)],
        })

    return sorted(cases, key=lambda c: (-c["risc"], -c["import_total"], c["data_inici"]))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contractes", type=Path, default=CONTRACTES_FILE)
    parser.add_argument("--administradors", type=Path, default=ADMIN_FILE)
    parser.add_argument("--output", type=Path, default=OUTPUT_FILE)
    args = parser.parse_args()

    with args.contractes.open("r", encoding="utf-8") as f:
        contractes = json.load(f)
    with args.administradors.open("r", encoding="utf-8") as f:
        administradors = json.load(f)

    cases = build_cases(contractes, administradors)
    payload = {
        "metodologia": "fraccionament_v2",
        "generat_a": date.today().isoformat(),
        "total_alertes": len(cases),
        "alertes": cases,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"fraccionament.json: {len(cases)} alertes")


if __name__ == "__main__":
    main()
