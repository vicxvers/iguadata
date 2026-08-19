#!/usr/bin/env python3
"""Genera alertes editorials de dependència de subvencions directes."""

import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from atomic_io import write_json_atomic


ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / "json" / "subvencions.json"
OUTPUT = ROOT / "json" / "dependencia.json"
DIRECT_RE = re.compile(r"\bdirect(?:a|e|es)?\b", re.IGNORECASE)


def normalize(value):
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def is_direct(row):
    fields = (
        "objecte_de_la_convocat_ria",
        "t_tol_convocat_ria_catal",
        "t_tol_convocat_ria_castell",
        "discriminador_de_la_concessi",
        "descripcion",
    )
    return any(DIRECT_RE.search(normalize(row.get(field))) for field in fields)


def logical_key(row):
    """Identitat de concessió: evita comptar republicacions com ajuts nous."""
    return (
        normalize(row.get("codi_raisc") or row.get("codigo")),
        normalize(row.get("codi_bdns")),
        normalize(row.get("discriminador_de_la_concessi")),
        normalize(row.get("cif_beneficiari")),
        f"{float(row.get('importe') or 0):.2f}",
        normalize(row.get("objecte_de_la_convocat_ria") or row.get("descripcion")),
    )


def deduplicate(rows):
    groups = defaultdict(list)
    for row in rows:
        groups[logical_key(row)].append(row)

    logical = []
    duplicate_count = 0
    for versions in groups.values():
        versions.sort(key=lambda item: (item.get("fecha") or "", str(item.get("id") or "")))
        representative = dict(versions[-1])
        representative["versions_font"] = len(versions)
        if len(versions) > 1:
            representative["dates_font"] = sorted({item.get("fecha") for item in versions if item.get("fecha")})
            duplicate_count += len(versions) - 1
        logical.append(representative)
    return logical, duplicate_count


def longest_consecutive(years):
    best = current = 0
    previous = None
    for year in sorted(set(years)):
        current = current + 1 if previous is not None and year == previous + 1 else 1
        best = max(best, current)
        previous = year
    return best


def risk_level(score):
    if score >= 85:
        return "CRITIC"
    if score >= 65:
        return "ALT"
    return "OBSERVACIO"


def score_case(direct_rows, all_rows):
    years = sorted({int(row.get("año") or str(row.get("fecha") or "")[:4]) for row in direct_rows})
    year_count = len(years)
    grant_count = len(direct_rows)
    consecutive = longest_consecutive(years)
    span = years[-1] - years[0] + 1
    regularity = year_count / span if span else 0
    direct_amount = sum(float(row.get("importe") or 0) for row in direct_rows)
    total_amount = sum(float(row.get("importe") or 0) for row in all_rows)
    direct_share = direct_amount / total_amount if total_amount else 0

    by_year = defaultdict(list)
    for row in direct_rows:
        year = int(row.get("año") or str(row.get("fecha") or "")[:4])
        by_year[year].append(row)
    accumulation_years = [
        year for year, items in by_year.items()
        if len(items) >= 2 and sum(float(item.get("importe") or 0) for item in items) > 3000
    ]

    year_score = 0 if year_count < 2 else min(32, 12 + (year_count - 2) * 7)
    grant_score = min(18, max(0, (grant_count - 1) * 3))
    consecutive_score = 0 if consecutive < 2 else min(20, 8 + (consecutive - 2) * 5)
    regularity_score = round(regularity * 10) if year_count >= 2 else 0
    share_score = 10 if direct_share >= 0.75 else 6 if direct_share >= 0.5 else 3 if direct_share >= 0.25 else 0
    accumulation_score = min(10, len(accumulation_years) * 5)
    score = min(100, year_score + grant_score + consecutive_score + regularity_score + share_score + accumulation_score)

    return {
        "score": score,
        "years": years,
        "consecutive": consecutive,
        "regularity": regularity,
        "direct_share": direct_share,
        "direct_amount": direct_amount,
        "accumulation_years": sorted(accumulation_years),
    }


def build_reason(metrics, grant_count):
    reasons = []
    if len(metrics["years"]) >= 2:
        reasons.append(f"Subvencions directes en {len(metrics['years'])} anys diferents")
    if metrics["consecutive"] >= 2:
        reasons.append(f"Subvencions directes durant {metrics['consecutive']} anys consecutius")
    if metrics["accumulation_years"]:
        reasons.append("Múltiples subvencions directes en un mateix any")
    if grant_count >= 5:
        reasons.append("Subvencions directes acumulades")
    return reasons


def main():
    rows = json.loads(INPUT.read_text(encoding="utf-8"))
    logical_rows, duplicate_count = deduplicate(rows)
    all_by_entity = defaultdict(list)
    direct_by_entity = defaultdict(list)

    for row in logical_rows:
        entity_key = normalize(row.get("cif_beneficiari")) or normalize(row.get("entitat_slug"))
        if not entity_key:
            continue
        all_by_entity[entity_key].append(row)
        if is_direct(row):
            direct_by_entity[entity_key].append(row)

    alerts = []
    for entity_key, direct_rows in direct_by_entity.items():
        metrics = score_case(direct_rows, all_by_entity[entity_key])
        recurrent = len(metrics["years"]) >= 2 and len(direct_rows) >= 3
        accumulated = any(
            sum(1 for row in direct_rows if int(row.get("año") or str(row.get("fecha") or "")[:4]) == year) >= 3
            for year in metrics["years"]
        )
        if not (recurrent or accumulated) or metrics["score"] < 40:
            continue

        direct_rows.sort(key=lambda item: (item.get("fecha") or "", str(item.get("id") or "")), reverse=True)
        first = direct_rows[0]
        dates = sorted(row.get("fecha") for row in direct_rows if row.get("fecha"))
        case_id = "DE-" + hashlib.sha1(entity_key.encode("utf-8")).hexdigest()[:8].upper()
        alerts.append({
            "id": case_id,
            "tipus_alerta": "dependencia",
            "risc": metrics["score"],
            "nivell": risk_level(metrics["score"]),
            "entitat": first.get("adjudicatario") or first.get("ra_social_del_beneficiari"),
            "entitat_slug": first.get("entitat_slug"),
            "cif": first.get("cif_beneficiari") or "",
            "import_total": round(metrics["direct_amount"], 2),
            "num_subvencions": len(direct_rows),
            "data_inici": dates[0] if dates else "",
            "data_fi": dates[-1] if dates else "",
            "anys": metrics["years"],
            "num_anys": len(metrics["years"]),
            "max_anys_consecutius": metrics["consecutive"],
            "quota_directa": round(metrics["direct_share"], 4),
            "anys_acumulacio": metrics["accumulation_years"],
            "motius": build_reason(metrics, len(direct_rows)),
            "subvencions": direct_rows,
        })

    alerts.sort(key=lambda item: (-item["risc"], -item["import_total"], item["entitat"]))
    payload = {
        "metodologia": "dependencia_v1",
        "generat_a": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "registres_font": len(rows),
        "concessions_logiques": len(logical_rows),
        "duplicats_logics_exclosos": duplicate_count,
        "total_alertes": len(alerts),
        "alertes": alerts,
    }
    write_json_atomic(OUTPUT, payload, indent=2)
    print(
        f"Generated {OUTPUT.relative_to(ROOT)}: {len(alerts)} alertes, "
        f"{duplicate_count} duplicats lògics exclosos"
    )


if __name__ == "__main__":
    main()
