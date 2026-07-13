#!/usr/bin/env python3
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from atomic_io import write_json_atomic


ROOT = Path(__file__).resolve().parents[2]
JSON_DIR = ROOT / "json"
DATA_FILES = [
    "contractes.json",
    "empreses.json",
    "persones.json",
    "carrecs.json",
    "fraccionament.json",
    "concentracio.json",
    "electoralisme.json",
    "contractes_arxiu.json",
]


def load_json(name):
    with (JSON_DIR / name).open("r", encoding="utf-8") as f:
        return json.load(f)


def data_version():
    digest = hashlib.sha256()
    for name in DATA_FILES:
        path = JSON_DIR / name
        digest.update(name.encode("utf-8"))
        digest.update(path.read_bytes())
    return digest.hexdigest()[:16]


def top_company_totals(empreses, field, limit):
    totals = {}
    for empresa in empreses:
        label = empresa.get(field) or "Sense classificar"
        amount = float(empresa.get("total_importe") or 0)
        if not amount or label == "Sense classificar":
            continue
        totals[label] = totals.get(label, 0) + amount

    return [
        {"label": label, "amount": amount}
        for label, amount in sorted(
            totals.items(),
            key=lambda item: item[1],
            reverse=True,
        )[:limit]
    ]


def minor_contract_trend(contractes):
    current_year = datetime.now(timezone.utc).year
    years = {}
    for contracte in contractes:
        year = str(contracte.get("fecha") or "")[:4]
        if not year.isdigit() or int(year) >= current_year:
            continue
        current = years.setdefault(year, {"year": year, "total": 0, "minor": 0, "minorAmount": 0.0})
        amount = float(contracte.get("importe") or 0)
        current["total"] += 1
        if "menor" in str(contracte.get("procedimiento") or "").lower():
            current["minor"] += 1
            current["minorAmount"] += amount

    rows = [
        {**row, "percent": row["minor"] / row["total"] if row["total"] else 0}
        for row in sorted(years.values(), key=lambda item: item["year"])
        if row["total"] >= 50
    ]
    max_percent = max((row["percent"] for row in rows), default=0.01)
    return [
        {
            **row,
            "barScale": max(0.08, row["percent"] / max_percent),
            "percentLabel": f"{round(row['percent'] * 100)}%",
        }
        for row in rows
    ]

def main():
    contractes = load_json("contractes.json")
    empreses = load_json("empreses.json")
    persones = load_json("persones.json")
    fraccionament = load_json("fraccionament.json")
    concentracio = load_json("concentracio.json")
    electoralisme = load_json("electoralisme.json")

    alertes_fraccionament = [
        item for item in fraccionament.get("alertes", [])
        if item.get("nivell") != "BAIX"
    ]
    alertes_electoralisme = [
        item for item in electoralisme.get("alertes", [])
        if item.get("nivell") != "BAIX"
    ]
    totes_alertes = (
        fraccionament.get("alertes", [])
        + concentracio.get("alertes", [])
        + electoralisme.get("alertes", [])
    )
    nivells = [
        str(item.get("nivell") or "").upper()
        for item in totes_alertes
    ]

    resum = {
        "version": data_version(),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "stats": {
            "total_contratos": len(contractes),
            "importe_total": sum(float(c.get("importe") or 0) for c in contractes),
            "num_empresas": len(empreses),
            "num_persones": len(persones),
            "num_alertes": (
                len(alertes_fraccionament)
                + len(concentracio.get("alertes", []))
                + len(alertes_electoralisme)
            ),
        },
        "home": {
            "top_sectors": top_company_totals(empreses, "sector", 5),
            "top_categories": top_company_totals(empreses, "categoria", 6),
"minor_contract_trend": minor_contract_trend(contractes),
            "risk_counts": {
                "alt": sum(level == "CRITIC" for level in nivells),
                "mitja": sum(level == "ALT" for level in nivells),
                "baix": sum(level in {"OBSERVACIO", "BAIX"} for level in nivells),
            },
        },
    }

    out = JSON_DIR / "resum.json"
    write_json_atomic(out, resum, indent=None, separators=(",", ":"))
    print(f"Generated {out.relative_to(ROOT)} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
