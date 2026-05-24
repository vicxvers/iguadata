"""
Reconstrueix (o actualitza) alias_empreses.json a partir de la columna
'nombre_posterior' de borme_empresas.parquet.

Us:
    python .github/scripts/build_alias_from_parquet.py

Logica:
  - Llegeix borme_empresas.parquet.
  - Per cada fila amb 'nombre_posterior' no-buit, afegeix:
        alias[nombre_posterior] <- empresa  (nom antic)
  - Uneix amb l'alias_empreses.json existent (si n'hi ha) per no perdre
    entrades historiques extretes amb extract_name_changes.py.
  - Escriu el resultat ordenat.

Aquest script esta dissenyat per executar-se a la CI despres de merge_parquets.py,
de manera que cada setmana s'afegeixen automaticament els nous canvis de
denominacio capturats pel parser actualitzat.
"""

import json
import sys
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[2]
PARQUET_EMPRESAS = ROOT / '.dev' / 'borme' / 'borme_empresas.parquet'
ALIAS_JSON = ROOT / '.github' / 'scripts' / 'alias_empreses.json'


def main():
    if not PARQUET_EMPRESAS.exists():
        print(f'No hi ha parquet a {PARQUET_EMPRESAS} -- sortint sense fer res.')
        return 0

    schema_names = set(pq.read_schema(PARQUET_EMPRESAS).names)
    if 'nombre_posterior' not in schema_names:
        print('Parquet sense columna nombre_posterior -- '
              'reparse necessari o pendent.')
        # Si ja existeix un alias_empreses.json, el mantenim tal qual.
        if not ALIAS_JSON.exists():
            ALIAS_JSON.parent.mkdir(parents=True, exist_ok=True)
            ALIAS_JSON.write_text('{}', encoding='utf-8')
        return 0

    df = pd.read_parquet(PARQUET_EMPRESAS, columns=['empresa', 'nombre_posterior'])

    mask = df['nombre_posterior'].notna() & (df['nombre_posterior'].astype(str).str.strip() != '')
    df = df[mask]
    print(f'Entrades amb canvi de denominacio al parquet: {len(df):,}')

    # Carrega existent (pot incloure entrades historiques que no estiguin al
    # parquet amb la nova columna si el parser encara no l'ha omplert).
    alias_map: dict = {}
    if ALIAS_JSON.exists():
        try:
            alias_map = {
                k: set(v) for k, v in json.loads(ALIAS_JSON.read_text(encoding='utf-8')).items()
            }
        except Exception as e:
            print(f'Warning: no s\'ha pogut llegir {ALIAS_JSON}: {e}')
            alias_map = {}
    else:
        alias_map = {}

    abans = sum(len(v) for v in alias_map.values())

    # Afegim les entrades noves del parquet.
    for _, r in df.iterrows():
        antic = str(r['empresa']).strip()
        nou = str(r['nombre_posterior']).strip()
        if not antic or not nou or antic.upper() == nou.upper():
            continue
        alias_map.setdefault(nou, set()).add(antic)

    despres = sum(len(v) for v in alias_map.values())
    print(f'Alies: {abans:,} -> {despres:,} (+{despres - abans:,})')

    alias_final = {k: sorted(v) for k, v in sorted(alias_map.items())}
    ALIAS_JSON.parent.mkdir(parents=True, exist_ok=True)
    ALIAS_JSON.write_text(
        json.dumps(alias_final, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    print(f'[OK] {ALIAS_JSON} ({len(alias_final):,} claus)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
