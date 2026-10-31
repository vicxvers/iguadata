"""Retain the last source snapshot of missing contracts without restoring revisions."""

from __future__ import annotations

from collections import defaultdict, deque

from contract_audit import detailed_key, norm
from contract_filters import is_analysis_contract

HISTORY_STATE = "preservat_desaparegut_socrata"


def contract_key(row: dict) -> tuple[str, ...]:
    """A source title is mutable; the contracting body, expediente and lot are not."""
    organism, code = norm(row.get("organismo")), norm(row.get("codigo"))
    if organism and code:
        return ("codigo", organism, code, norm(row.get("numero_lot")))
    return ("fallback", *detailed_key(row))


def has_current_version(row: dict, keys: set[tuple[str, ...]]) -> bool:
    if row.get("id_socrata") and ("socrata", str(row["id_socrata"])) in keys:
        return True
    key = contract_key(row)
    if key in keys:
        return True
    # Older snapshots did not record lots. A populated source lot replaces that
    # older aggregate; importing it as another contract would duplicate its value.
    return key[0] == "codigo" and not key[-1] and any(
        candidate[:3] == key[:3] for candidate in keys
    )


def snapshot_keys(rows: list[dict]) -> set[tuple[str, ...]]:
    keys = {contract_key(row) for row in rows}
    keys.update(("socrata", str(row["id_socrata"])) for row in rows if row.get("id_socrata"))
    return keys


def merge_snapshot(previous: list[dict], fresh: list[dict], *, observed_on: str | None,
                   legacy_archive: list[dict] = ()) -> list[dict]:
    """Fresh versions win; absent groups keep their last known rows and dates."""
    previous_by_detail = defaultdict(deque)
    previous_by_group = defaultdict(list)
    previous_by_source = {str(row["id_socrata"]): row for row in previous if row.get("id_socrata")}
    for row in previous:
        previous_by_detail[detailed_key(row)].append(row)
        previous_by_group[contract_key(row)].append(row)

    used_ids = set()
    next_id = max((row.get("id", 0) for row in previous
                   if isinstance(row.get("id"), int)), default=0) + 1

    def assign_id(row, preferred=None):
        nonlocal next_id
        if not isinstance(preferred, int) or preferred in used_ids:
            preferred = next_id
            next_id += 1
        used_ids.add(preferred)
        row["id"] = preferred

    result = []
    fresh_groups = defaultdict(list)
    for row in fresh:
        fresh_groups[contract_key(row)].append(row)
    for source in fresh:
        row = dict(source)
        key = contract_key(row)
        exact = previous_by_detail[detailed_key(row)]
        before = exact.popleft() if exact else None
        if before is None and row.get("id_socrata"):
            before = previous_by_source.get(str(row["id_socrata"]))
        if before is None and len(previous_by_group[key]) == len(fresh_groups[key]) == 1:
            before = previous_by_group[key][0]
        assign_id(row, before.get("id") if before else None)
        row["estat_font"] = "actiu_socrata"
        row["preservat_iguadata"] = False
        row["exclos_analisis"] = bool(before and before.get("exclos_analisis") is True)
        row.pop("primera_absencia_detectada", None)
        if observed_on:
            row["ultima_presencia_socrata"] = observed_on
        elif before and before.get("ultima_presencia_socrata"):
            row["ultima_presencia_socrata"] = before["ultima_presencia_socrata"]
        result.append(row)

    fresh_keys = snapshot_keys(fresh)
    retained_keys = set()
    for source in previous:
        if not is_analysis_contract(source) or has_current_version(source, fresh_keys):
            continue
        row = dict(source)
        row["estat_font"] = HISTORY_STATE
        row["preservat_iguadata"] = True
        row["exclos_analisis"] = False
        row.setdefault("primera_absencia_detectada", observed_on)
        assign_id(row, source.get("id"))
        result.append(row)
        retained_keys.add(contract_key(row))

    # Bootstrap the old preservation format. Audit wrappers and superseded
    # originals never become public contracts; only the latest absent group does.
    superseded = {detailed_key(event["contracte_original"])
                  for event in legacy_archive if event.get("tipus_canvi") == "modificat"
                  and isinstance(event.get("contracte_original"), dict)}
    legacy_groups = defaultdict(list)
    for event in legacy_archive:
        if event.get("tipus_canvi") != "desaparegut":
            continue
        source = event.get("contracte_original")
        if not isinstance(source, dict) or source.get("exclos_analisis") is True:
            continue
        if detailed_key(source) in superseded:
            continue
        legacy_groups[contract_key(source)].append(event)
    known_keys = fresh_keys | retained_keys | set(previous_by_group)
    for events in legacy_groups.values():
        source = events[0]["contracte_original"]
        if has_current_version(source, known_keys):
            continue
        latest = max(event.get("detectat_a") or event.get("primera_absencia_detectada") or ""
                     for event in events)
        seen = set()
        for event in events:
            detected = event.get("detectat_a") or event.get("primera_absencia_detectada") or ""
            source = event["contracte_original"]
            fingerprint = detailed_key(source)
            if detected != latest or fingerprint in seen:
                continue
            seen.add(fingerprint)
            row = dict(source)
            for field in ("cpv", "numero_lot", "contracte_origen"):
                row.setdefault(field, "")
            row.update(estat_font=HISTORY_STATE, preservat_iguadata=True, exclos_analisis=False,
                       primera_absencia_detectada=detected)
            assign_id(row)
            result.append(row)

    return sorted(result, key=lambda row: row.get("fecha") or "", reverse=True)
