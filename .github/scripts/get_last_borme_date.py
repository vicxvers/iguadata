"""
Print the latest fecha_borme present in borme_empresas.parquet.

Used by the GitHub Actions workflow to determine the start date of the
incremental scrape (last date in the parquet, minus a safety overlap).

If the parquet doesn't exist (cold start), prints DEFAULT_START so the
workflow can bootstrap from zero if ever needed.

Usage:
    python get_last_borme_date.py [path/to/borme_empresas.parquet]

Output: a single YYYY-MM-DD string on stdout.
"""

import sys
from pathlib import Path

DEFAULT_START = "2009-01-01"


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".dev/borme/borme_empresas.parquet")

    if not path.exists():
        print(DEFAULT_START)
        return

    try:
        import pandas as pd
        df = pd.read_parquet(path, columns=["fecha_borme"])
    except Exception:
        print(DEFAULT_START)
        return

    if len(df) == 0:
        print(DEFAULT_START)
        return

    import pandas as pd
    last = pd.to_datetime(df["fecha_borme"], errors="coerce").max()
    if pd.isna(last):
        print(DEFAULT_START)
        return

    print(last.date().isoformat())


if __name__ == "__main__":
    main()
