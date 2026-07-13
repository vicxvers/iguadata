"""Attach preserved alerts and investigation references to contract changes."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from atomic_io import write_json_atomic

ROOT = Path(__file__).resolve().parents[2]


def signature(contract: dict) -> tuple[str, str, str, str]:
    return (
        str(contract.get("codigo") or "").strip().upper(),
        str(contract.get("fecha") or "").strip(),
        f"{float(contract.get('importe') or 0):.2f}",
        " ".join(str(contract.get("adjudicatario") or "").strip().upper().split()),
    )


def preserved_alerts(previous_dir: Path) -> dict[tuple[str, ...], list[dict]]:
    index: dict[tuple[str, ...], list[dict]] = {}
    for analysis in ("fraccionament", "concentracio", "electoralisme"):
        path = previous_dir / f"{analysis}.json"
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        for alert in payload.get("alertes", []):
            snapshot = {"analisi": analysis, "alerta": alert}
            for contract in alert.get("contractes", []):
                index.setdefault(signature(contract), []).append(snapshot)
    return index


def investigation_index(investigations: list) -> dict[tuple[str, ...], set[str]]:
    index: dict[tuple[str, ...], set[str]] = {}
    for investigation in investigations:
        slug = investigation.get("slug")
        for block in investigation.get("content", []):
            for contract in block.get("contract_snapshots", []):
                index.setdefault(signature(contract), set()).add(slug)
    return index


def enrich_changes(changes: list, alerts: dict, investigations: dict) -> int:
    updated = 0
    for change in changes:
        if change.get("impacte_calculat") is True:
            continue
        key = signature(change.get("contracte_anterior") or {})
        seen = set()
        affected = []
        for item in alerts.get(key, []):
            marker = (item["analisi"], json.dumps(item["alerta"], ensure_ascii=False, sort_keys=True))
            if marker not in seen:
                seen.add(marker)
                affected.append(item)
        change["alertes_afectades"] = affected
        change["investigacions_afectades"] = sorted(investigations.get(key, set()))
        change["impacte_calculat"] = True
        updated += 1
    return updated


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--changes", type=Path, default=ROOT / "json" / "canvis_contractes.json")
    parser.add_argument("--investigations", type=Path, default=ROOT / "json" / "investigacio.json")
    parser.add_argument("--previous-dir", type=Path, required=True)
    args = parser.parse_args()
    changes = json.loads(args.changes.read_text(encoding="utf-8"))
    investigations = json.loads(args.investigations.read_text(encoding="utf-8"))
    updated = enrich_changes(changes, preserved_alerts(args.previous_dir), investigation_index(investigations))
    write_json_atomic(args.changes, changes)
    print(f"Audit events enriched: {updated}")


if __name__ == "__main__":
    main()
