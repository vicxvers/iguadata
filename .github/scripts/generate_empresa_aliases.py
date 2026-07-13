#!/usr/bin/env python3
"""
Genera json/empresa_aliases.json con alias historicos de empresas que existen
en Iguadata, reducido para uso en frontend.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from atomic_io import write_json_atomic


ROOT = Path(__file__).resolve().parents[2]
EMPRESES_JSON = ROOT / "json" / "empreses.json"
ALIAS_JSON = ROOT / ".github" / "scripts" / "alias_empreses.json"
OUTPUT_JSON = ROOT / "json" / "empresa_aliases.json"


def fold(value: str) -> str:
    value = (value or "").upper().replace("Ñ", "##ENIE##")
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return value.replace("##ENIE##", "Ñ")


def norm_company(value: str) -> str:
    value = fold(value)
    value = re.sub(
        r"\b(SOCIEDAD|LIMITADA|ANONIMA|UNIPERSONAL|SLU|S\.L\.U\.|S\.L\.|SL|SA|S\.A\.|SAU|S\.A\.U\.)\b",
        "",
        value,
    )
    value = re.sub(r"[^A-ZÑ0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def main() -> None:
    with EMPRESES_JSON.open("r", encoding="utf-8") as f:
        empreses = json.load(f)
    with ALIAS_JSON.open("r", encoding="utf-8") as f:
        alias_map = json.load(f)

    current_by_norm = {
        norm_company(emp.get("nom", "")): emp.get("nom", "")
        for emp in empreses
        if emp.get("nom")
    }

    aliases: dict[str, list[str]] = {}
    for current_name, old_names in alias_map.items():
        matched_current = current_by_norm.get(norm_company(current_name))
        if not matched_current:
            continue
        clean_old_names = sorted({
            old.strip()
            for old in old_names or []
            if old and norm_company(old) != norm_company(matched_current)
        })
        if clean_old_names:
            aliases[matched_current] = clean_old_names

    payload = {
        "version": 1,
        "aliases": dict(sorted(aliases.items())),
    }
    write_json_atomic(OUTPUT_JSON, payload)
    print(f"empresa_aliases.json: {sum(len(v) for v in aliases.values())} alias")


if __name__ == "__main__":
    main()
