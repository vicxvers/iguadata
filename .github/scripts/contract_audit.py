"""Stable identities and diffs for the contract audit trail."""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal, InvalidOperation

TRACKED_FIELDS = (
    "codigo",
    "organismo",
    "numero_lot",
    "contracte_origen",
    "tipo",
    "procedimiento",
    "descripcion",
    "importe",
    "adjudicatario",
    "fecha",
    "cpv",
)


def norm(value) -> str:
    return " ".join(str(value or "").strip().upper().split())


def amount(value) -> str:
    try:
        return f"{Decimal(str(value or 0)):.2f}"
    except InvalidOperation:
        return "0.00"


def detailed_key(contract: dict) -> tuple[str, ...]:
    return (
        norm(contract.get("codigo")),
        norm(contract.get("organismo")),
        norm(contract.get("numero_lot")),
        norm(contract.get("contracte_origen")),
        norm(contract.get("fecha")),
        amount(contract.get("importe")),
        norm(contract.get("adjudicatario")),
        norm(contract.get("descripcion"))[:180],
    )


def identity_key(contract: dict) -> tuple[str, ...] | None:
    organism = norm(contract.get("organismo"))
    code = norm(contract.get("codigo"))
    if not organism or not code:
        return None
    lot = norm(contract.get("numero_lot"))
    source_contract = norm(contract.get("contracte_origen"))
    if lot or source_contract:
        return organism, code, lot, source_contract
    return organism, code


def contract_fingerprint(contract: dict) -> str:
    payload = json.dumps(detailed_key(contract), ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:20]


def contract_differences(before: dict, after: dict) -> list[dict]:
    differences = []
    for field in TRACKED_FIELDS:
        # A field introduced by a newer Iguadata schema is a baseline backfill,
        # not evidence that the source altered the historical contract.
        if field not in before:
            continue
        old = amount(before.get(field)) if field == "importe" else str(before.get(field) or "").strip()
        new = amount(after.get(field)) if field == "importe" else str(after.get(field) or "").strip()
        if old != new:
            differences.append({"camp": field, "abans": old, "despres": new})
    return differences


def change_id(kind: str, before: dict, after: dict | None = None) -> str:
    signature = "|".join(
        [
            kind,
            contract_fingerprint(before),
            contract_fingerprint(after) if after else "",
        ]
    )
    return "CANVI-" + hashlib.sha256(signature.encode("utf-8")).hexdigest()[:16].upper()
