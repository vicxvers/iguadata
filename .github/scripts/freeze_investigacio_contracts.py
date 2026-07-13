"""Freeze the contract evidence cited by published investigations."""

from __future__ import annotations

import argparse
import copy
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from atomic_io import write_json_atomic

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INVESTIGATIONS = ROOT / "json" / "investigacio.json"
DEFAULT_CONTRACTS = ROOT / "json" / "contractes.json"
DEFAULT_ARCHIVE = ROOT / "json" / "contractes_arxiu.json"


def slugify(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return text


def base_slug(contract: dict) -> str:
    return "-".join(part for part in (slugify(contract.get("fecha")), slugify(contract.get("codigo"))) if part)


def archive_contracts(rows: list) -> list[dict]:
    result = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        original = row.get("contracte_original", row)
        if isinstance(original, dict):
            result.append(original)
    return result


def frozen_copy(contract: dict, slug: str, captured_at: str) -> dict:
    snapshot = copy.deepcopy(contract)
    snapshot["slug"] = slug
    snapshot["evidencia_congelada"] = True
    snapshot["capturada_a"] = captured_at
    return snapshot


def freeze(investigations: list, contracts: list, archived: list, captured_at: str) -> tuple[list, int, list[str]]:
    sources = [row for row in contracts + archived if isinstance(row, dict)]
    by_code: dict[str, list[dict]] = {}
    for contract in sources:
        code = str(contract.get("codigo") or "").strip()
        if code:
            by_code.setdefault(code, []).append(contract)

    changed = 0
    unresolved = []
    for investigation in investigations:
        investigation_slug = investigation.get("slug", "sense-slug")
        for block_index, block in enumerate(investigation.get("content", [])):
            if block.get("type") not in {"contracts", "contracts_paginated"}:
                continue
            existing = block.get("contract_snapshots") or []
            existing_by_slug = {str(row.get("slug") or ""): row for row in existing if isinstance(row, dict)}
            existing_by_code = {str(row.get("codigo") or "").strip(): row for row in existing if isinstance(row, dict)}
            snapshots = list(existing)

            if block.get("type") == "contracts_paginated":
                for code_value in block.get("codes", []):
                    code = str(code_value or "").strip()
                    if code in existing_by_code:
                        continue
                    candidates = by_code.get(code, [])
                    if not candidates:
                        unresolved.append(f"{investigation_slug}:{block_index}:codigo:{code}")
                        continue
                    # Preserve the same record the frontend historically showed
                    # when two contracting bodies reused an expediente number.
                    snapshots.append(frozen_copy(candidates[0], base_slug(candidates[0]), captured_at))
                    changed += 1
            else:
                for wanted_slug in block.get("slugs", []):
                    wanted = str(wanted_slug or "").strip()
                    if wanted in existing_by_slug:
                        continue
                    candidates = [row for row in sources if base_slug(row) == wanted]
                    if len(candidates) != 1:
                        unresolved.append(f"{investigation_slug}:{block_index}:slug:{wanted}")
                        continue
                    snapshots.append(frozen_copy(candidates[0], wanted, captured_at))
                    changed += 1

            block["contract_snapshots"] = snapshots
    return investigations, changed, unresolved


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--investigations", type=Path, default=DEFAULT_INVESTIGATIONS)
    parser.add_argument("--contracts", type=Path, default=DEFAULT_CONTRACTS)
    parser.add_argument("--archive", type=Path, default=DEFAULT_ARCHIVE)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    investigations = json.loads(args.investigations.read_text(encoding="utf-8"))
    contracts = json.loads(args.contracts.read_text(encoding="utf-8"))
    archive = archive_contracts(json.loads(args.archive.read_text(encoding="utf-8")))
    captured_at = datetime.now(timezone.utc).date().isoformat()
    payload, changed, unresolved = freeze(investigations, contracts, archive, captured_at)
    if unresolved:
        raise SystemExit("Unresolved investigation references:\n" + "\n".join(unresolved))
    if args.check and changed:
        raise SystemExit(f"Missing {changed} frozen investigation contract snapshots")
    if not args.check:
        write_json_atomic(args.investigations, payload)
    print(f"Frozen snapshots added: {changed}; unresolved: 0")


if __name__ == "__main__":
    main()
