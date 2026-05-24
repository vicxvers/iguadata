"""
Merge delta parquets (produced by borme_batch_parser.py on a rolling window
of new PDFs) into the big accumulated parquets.

Usage:
    python merge_parquets.py --big-dir .dev/borme --delta-dir scratch/delta

Behavior:
    - Reads big_dir/borme_empresas.parquet + big_dir/borme_cargos.parquet.
    - Reads delta_dir/borme_empresas.parquet + delta_dir/borme_cargos.parquet.
    - Concatenates, deduplicates on the same keys used by the parser, and
      writes back to big_dir in place.
    - If big parquets don't exist (cold start), the delta becomes the big.
    - If delta parquets don't exist (no new PDFs this run), does nothing.

Intended for the GitHub Actions weekly update workflow.
"""

import argparse
from pathlib import Path

import pandas as pd


DEDUP_KEYS = {
    "borme_empresas.parquet": ["fecha_borme", "num_entrada", "empresa_norm"],
    "borme_cargos.parquet":   ["fecha_borme", "num_entrada", "cargo", "persona", "tipo_acto"],
}


def merge_one(big_path: Path, delta_path: Path, keys: list) -> None:
    name = big_path.name

    if not delta_path.exists():
        print(f"  [SKIP] {name}: sin delta (no hi ha PDFs nous)")
        return

    delta = pd.read_parquet(delta_path)
    if len(delta) == 0:
        print(f"  [SKIP] {name}: delta buit")
        return

    if big_path.exists():
        big = pd.read_parquet(big_path)
        before = len(big)
        combined = pd.concat([big, delta], ignore_index=True)
    else:
        print(f"  [COLD-START] {name}: no hi ha parquet acumulat, el delta passa a ser el big")
        before = 0
        combined = delta

    combined = combined.drop_duplicates(subset=keys, keep="first")
    after = len(combined)
    added = after - before

    big_path.parent.mkdir(parents=True, exist_ok=True)
    combined.to_parquet(big_path, index=False, engine="pyarrow")

    size_mb = big_path.stat().st_size / 1e6
    print(f"  [OK] {name}: {before:,} -> {after:,} files ({added:+,}) | {size_mb:.1f} MB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--big-dir", required=True, help="Directori dels parquets acumulats")
    ap.add_argument("--delta-dir", required=True, help="Directori dels parquets delta")
    args = ap.parse_args()

    big_dir = Path(args.big_dir)
    delta_dir = Path(args.delta_dir)

    print(f"Merge: {delta_dir} -> {big_dir}")
    for name, keys in DEDUP_KEYS.items():
        merge_one(big_dir / name, delta_dir / name, keys)
    print("[OK] Merge complete")


if __name__ == "__main__":
    main()
