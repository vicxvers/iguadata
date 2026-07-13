"""Escriptures at?miques per evitar fitxers parcials o corruptes."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path


def _temporary_path(destination: Path) -> Path:
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, raw_path = tempfile.mkstemp(
        prefix=f".{destination.name}.",
        suffix=".tmp",
        dir=destination.parent,
    )
    os.close(fd)
    return Path(raw_path)


def write_json_atomic(
    destination: Path | str,
    payload,
    *,
    indent: int | None = 2,
    separators: tuple[str, str] | None = None,
) -> None:
    destination = Path(destination)
    temporary = _temporary_path(destination)
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(
                payload,
                handle,
                ensure_ascii=False,
                indent=indent,
                separators=separators,
            )
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        with temporary.open("r", encoding="utf-8") as handle:
            json.load(handle)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def write_parquet_atomic(dataframe, destination: Path | str) -> None:
    import pyarrow.parquet as parquet

    destination = Path(destination)
    temporary = _temporary_path(destination)
    try:
        dataframe.to_parquet(temporary, index=False, engine="pyarrow")
        metadata = parquet.ParquetFile(temporary).metadata
        if metadata.num_rows != len(dataframe):
            raise ValueError(
                f"Parquet incomplet: {metadata.num_rows} files, esperades {len(dataframe)}"
            )
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
