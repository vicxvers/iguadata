#!/usr/bin/env python3
"""
Validate that a refreshed contractes.json did not lose a suspicious amount of
historical data compared with the previous repository snapshot.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from contract_filters import is_analysis_contract


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--old", required=True, help="Previous contractes.json")
    parser.add_argument("--new", required=True, help="Fresh contractes.json")
    parser.add_argument("--max-count-drop-pct", type=float, default=5.0)
    parser.add_argument("--max-amount-drop-pct", type=float, default=10.0)
    parser.add_argument("--max-missing-contracts", type=int, default=50)
    return parser.parse_args()


def load_contracts(path: str) -> list[dict]:
    with Path(path).open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise SystemExit(f"{path} is not a JSON array")
    return [row for row in data if is_analysis_contract(row)]


def norm(value: object) -> str:
    return " ".join(str(value or "").strip().upper().split())


def contract_key(row: dict) -> tuple[str, ...] | None:
    code = norm(row.get("codigo"))
    org = norm(row.get("organismo"))
    if code:
        return ("codigo", org, code)

    slug = norm(row.get("slug"))
    if slug:
        return ("slug", slug)

    desc = norm(row.get("descripcion"))
    company = norm(row.get("adjudicatario"))
    date = norm(row.get("fecha"))
    amount = round(float(row.get("importe") or 0), 2)
    if desc and company and date:
        return ("fallback", company, date, f"{amount:.2f}", desc[:140])
    return None


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

    old_count = len(old_rows)
    new_count = len(new_rows)
    old_amount = total_amount(old_rows)
    new_amount = total_amount(new_rows)
    count_drop = pct_drop(old_count, new_count)
    amount_drop = pct_drop(old_amount, new_amount)

    old_keys = {key for row in old_rows if (key := contract_key(row))}
    new_keys = {key for row in new_rows if (key := contract_key(row))}
    missing = old_keys - new_keys

    failures = []
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
            f"{len(missing):,} previous contract keys are missing "
            f"(limit {args.max_missing_contracts:,})"
        )

    print(f"Previous contracts: {old_count:,} ({old_amount:,.2f} EUR)")
    print(f"Fresh contracts   : {new_count:,} ({new_amount:,.2f} EUR)")
    print(f"Missing keys      : {len(missing):,}")

    if failures:
        print("Suspicious Socrata refresh detected:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("OK contractes.json passed anti-deletion guard.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
