#!/usr/bin/env python3
"""
Validate that a refreshed contractes.json did not lose a suspicious amount of
historical data compared with the previous repository snapshot.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from atomic_io import write_json_atomic
from contract_audit import contract_differences
from contract_filters import is_analysis_contract, is_live_contract
from contract_history import contract_key, has_current_version, snapshot_keys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--old", required=True, help="Previous contractes.json")
    parser.add_argument("--new", required=True, help="Fresh contractes.json")
    parser.add_argument("--max-count-drop-pct", type=float, default=5.0)
    parser.add_argument("--max-amount-drop-pct", type=float, default=10.0)
    parser.add_argument("--max-missing-contracts", type=int, default=0)
    parser.add_argument(
        "--report",
        help="Optional JSON report containing the exact missing contracts.",
    )
    return parser.parse_args()


def load_contracts(path: str) -> list[dict]:
    with Path(path).open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise SystemExit(f"{path} is not a JSON array")
    return [row for row in data if is_analysis_contract(row)]


def total_amount(rows: list[dict]) -> float:
    return sum(float(row.get("importe") or 0) for row in rows)


def pct_drop(old: float, new: float) -> float:
    if old <= 0:
        return 0.0
    return max(0.0, (old - new) / old * 100)


def main() -> int:
    args = parse_args()
    old_rows = load_contracts(args.old)
    new_rows = load_contracts(args.new)

    old_live = [row for row in old_rows if is_live_contract(row)]
    new_live = [row for row in new_rows if is_live_contract(row)]
    old_count = len(old_live)
    new_count = len(new_live)
    old_amount = total_amount(old_live)
    new_amount = total_amount(new_live)
    count_drop = pct_drop(old_count, new_count)
    amount_drop = pct_drop(old_amount, new_amount)

    live_keys = snapshot_keys(new_live)
    source_absences = [row for row in old_live if not has_current_version(row, live_keys)]
    absence_pct = len(source_absences) / old_count * 100 if old_count else 0
    new_by_key = {}
    for row in new_rows:
        new_by_key.setdefault(contract_key(row), []).append(row)
    missing_contracts = [
        row for row in old_rows
        if not has_current_version(row, live_keys)
        and not any(not contract_differences(row, current)
                    for current in new_by_key.get(contract_key(row), []))
    ]
    missing = {contract_key(row) for row in missing_contracts}

    failures = []
    if not new_live:
        failures.append("source snapshot is empty")
    if absence_pct > args.max_count_drop_pct:
        failures.append(
            f"{absence_pct:.2f}% of previous source contracts disappeared "
            f"(limit {args.max_count_drop_pct:.2f}%)"
        )
    if count_drop > args.max_count_drop_pct:
        failures.append(
            f"contract count dropped {count_drop:.2f}% "
            f"({old_count:,} -> {new_count:,}; limit {args.max_count_drop_pct:.2f}%)"
        )
    if amount_drop > args.max_amount_drop_pct:
        failures.append(
            f"awarded amount dropped {amount_drop:.2f}% "
            f"({old_amount:,.2f} -> {new_amount:,.2f}; limit {args.max_amount_drop_pct:.2f}%)"
        )
    if len(missing) > args.max_missing_contracts:
        failures.append(
            f"{len(missing):,} previous contract keys have no current or preserved version "
            f"(limit {args.max_missing_contracts:,})"
        )

    print(f"Previous contracts: {old_count:,} ({old_amount:,.2f} EUR)")
    print(f"Fresh contracts   : {new_count:,} ({new_amount:,.2f} EUR)")
    print(f"Missing keys      : {len(missing):,}")
    print(f"Source absences   : {len(source_absences):,} ({absence_pct:.2f}%)")
    print(f"Preserved history : {sum(not is_live_contract(row) for row in new_rows):,}")

    if args.report:
        missing_contracts = sorted(
            missing_contracts,
            key=lambda row: (row.get("fecha") or "", row.get("codigo") or ""),
        )
        write_json_atomic(
            args.report,
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "status": "blocked" if failures else "passed",
                "summary": {
                    "previous_contracts": old_count,
                    "fresh_contracts": new_count,
                    "previous_amount": round(old_amount, 2),
                    "fresh_amount": round(new_amount, 2),
                    "missing_keys": len(missing),
                    "source_absences": len(source_absences),
                    "preserved_contracts": sum(not is_live_contract(row) for row in new_rows),
                },
                "thresholds": {
                    "max_count_drop_pct": args.max_count_drop_pct,
                    "max_amount_drop_pct": args.max_amount_drop_pct,
                    "max_missing_contracts": args.max_missing_contracts,
                },
                "failures": failures,
                "missing_contracts": missing_contracts,
                "source_absences": source_absences,
            },
        )
        print(f"Contract deletion report: {args.report}")

    if failures:
        print("Suspicious Socrata refresh detected:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("OK contractes.json passed anti-deletion guard.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
