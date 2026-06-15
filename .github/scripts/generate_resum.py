#!/usr/bin/env python3
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


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
            "risk_counts": {
                "alt": sum(level == "CRITIC" for level in nivells),
                "mitja": sum(level == "ALT" for level in nivells),
                "baix": sum(level in {"OBSERVACIO", "BAIX"} for level in nivells),
            },
        },
    }

    out = JSON_DIR / "resum.json"
    out.write_text(
        json.dumps(resum, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(f"Generated {out.relative_to(ROOT)} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
