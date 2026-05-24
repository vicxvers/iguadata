"""
Genera json/carrecs.json a partir del dataset BORME local.

Estrategia Multi-key matching (v2):
  - Normalitza AMBDOS costats (API i BORME) a una forma canonica comuna.
  - Variant A (robust):   normalize_empresa() original.
  - Variant B (agressiva): tambe elimina UNIPERSONAL i residus post-SL/SA.
  Aix0 recupera empreses on el parser del BORME va guardar empresa_norm
  amb punts (ex: "S.L") o amb sufixos compostos (ex: "SL UNIPERSONAL").

Us:  python .github/scripts/generate_carrecs.py
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))  # sibling modules in .github/scripts/

from normalize_empreses import normalize_empresa
from classify_persones import is_company_name

PARQUET_CARGOS = ROOT / '.dev' / 'borme' / 'borme_cargos.parquet'
INPUT_EMPRESES = ROOT / 'json' / 'empreses.json'
ALIAS_JSON     = ROOT / '.github' / 'scripts' / 'alias_empreses.json'
OUTPUT_JSON    = ROOT / 'json' / 'carrecs.json'
OUTPUT_PURGED  = ROOT / 'json' / 'carrecs_eliminats.json'

ACTOS_ACTIUS = {'nombramiento', 'reeleccion'}
ACTO_RANK = {'nombramiento': 0, 'reeleccion': 0, 'cese': 1, 'revocacion': 1}

# Purga estricta: filtra files on 'persona' conte text corrupte d'Objecte Social.
# Causat per fallades del parser en entrades on l'administrador es persona juridica.
MAX_LEN_PERSONA = 65

# (1) Stop-words d'inici -- nomes les que NO son prefixos de cognom castella/catala.
# Exclosos deliberadament: DE, DEL, LA, EL, LAS, LOS (cognoms tipus "DE LA FUENTE", "DEL RIO").
# Les fallades residuals amb aquests prefixos es capturen amb la resta d'heuristiques.
STOP_START_PATTERN = (
    r'^(?:Y|O|U|A|E|EN|CON|POR|PARA|QUE|AL|SOBRE|ENTRE|HACIA|SEGUN'
    r'|DESDE|HASTA|COMO|ASI|SI|NO|NI|UN|UNA|UNOS|UNAS)\s'
    # Nota: MAS eliminat -- es cognom catala freqüent (ex: "MAS TALADRIZ")
)

# (2) Paraules clau propies d'Objecte Social (mai apareixen en un nom).
OBJECTE_SOCIAL_PATTERN = (
    r'ARTES GRAFICAS|SERVICIOS DE|SERVICIO DE|COMERCIALIZACION|FABRICACION'
    r'|PRODUCCION|\bDISEÑO\b|\bVENTA\b|\bCOMPRAVENTA\b|EL ESCANER|\bCURSOS\b'
    r'|\bTRABAJOS\b|\bJARDINERIA\b|\bPODA\b|REUTILIZACION|DEPURACION'
    r'|\bINSTALACION\b|\bINSTALACIONES\b|\bMANTENIMIENTO\b|\bCONSTRUCCION\b'
    r'|\bEDIFICACION\b|\bREFORMA\b|\bREHABILITACION\b|\bEXPLOTACION\b'
    r'|\bDISTRIBUCION\b|\bIMPORTACION\b|\bEXPORTACION\b'
    r'|\bCONSULTORIA\b|\bASESORING\b|\bASESORIAMIENTO\b|\bTRANSPORTE\b'
    r'|GESTION DE|\bACTIVIDADES\b|\bPROMOCION\b|\bCONTRATACION\b'
    r'|\bREALIZACION\b|\bPRESTACION\b|\bSUMINISTRO\b'
    r'|TALES COMO|TODO TIPO|TODA CLASE'
    # \b evita falsos positius per coincidencia de substring (ex: VENTA dins VENTAYOL)
)

# (3) El�lipsi (..) - indica text truncat.
ELLIPSIS_PATTERN = r'\.\.'

# (4) Coma enganxada a lletra (ex: "DEPURACION,REUTILIZACION") - text comprimit.
COMMA_NOSPACE_PATTERN = r',\w'

# Sufixos addicionals que normalize_empresa no elimina en solitari
_EXTRA_SUFFIXES = [
    ' UNIPERSONAL', ' SME',
    ' SAU', ' SLU', ' SAD', ' SLL', ' SLP', ' SLNE',
    ' SA SME', ' SAE', ' SA', ' SL', ' SC',
    ' SCA', ' SCCL', ' SCOOP', ' SE', ' SRL', ' AIE',
]


def normalize_agressiva(name: str) -> str:
    """normalize_empresa + eliminacio de UNIPERSONAL i re-tanda de sufixos."""
    n = normalize_empresa(name)
    if not n:
        return n
    changed = True
    while changed:
        changed = False
        for suffix in _EXTRA_SUFFIXES:
            if n.endswith(suffix):
                n = n[:-len(suffix)].strip()
                changed = True
                break
    return n


def all_canonicals(name: str) -> set:
    """Retorna el conjunt de canonics (A i B) per a un nom."""
    a = normalize_empresa(name)
    b = normalize_agressiva(name)
    return {c for c in (a, b) if c}


def normalize_persona_key(name: str) -> str:
    """Clau robusta per evitar duplicats menors de la mateixa persona."""
    n = (name or '').upper().replace('Ñ', 'N')
    n = unicodedata.normalize('NFD', n)
    n = ''.join(c for c in n if unicodedata.category(c) != 'Mn')
    n = re.sub(r'[^A-Z0-9]+', ' ', n)
    return re.sub(r'\s+', ' ', n).strip()


def cargo_family(cargo: str) -> str:
    """Agrupa variants d'apoderament per resoldre revocacions i duplicats."""
    c = normalize_persona_key(cargo)
    if c.startswith('APO') or 'APODER' in c:
        return 'PODER'
    return c or 'ALTRE'


def cargo_rank(cargo: str) -> int:
    c = cargo_family(cargo)
    if c == 'PODER':
        return 10
    if c in {'PRESIDENTE', 'VICEPRESID'}:
        return 0
    if c in {'CONSEJERO', 'CONSELLER'}:
        return 1
    return 5


def main():
    print("  Llegint empreses.json...")
    with open(INPUT_EMPRESES, encoding='utf-8') as f:
        empreses = json.load(f)

    # Carrega mapa d'alies (nom_actual -> [noms_antics]) si existeix.
    alias_map: dict[str, list] = {}
    if ALIAS_JSON.exists():
        with open(ALIAS_JSON, encoding='utf-8') as f:
            alias_map = json.load(f)
        # Construim canonical_alias -> set(canonicals_antics) per resolucio creuada.
        canonical_alias_to_old: dict[str, set] = {}
        for nom_actual, antics in alias_map.items():
            for canon_nou in all_canonicals(nom_actual):
                dest = canonical_alias_to_old.setdefault(canon_nou, set())
                for antic in antics:
                    dest.update(all_canonicals(antic))
        print(f"  Alies carregats: {len(alias_map):,} noms actuals -> "
              f"{sum(len(v) for v in alias_map.values()):,} antics")
    else:
        canonical_alias_to_old = {}
        print("  (sense alies; executa extract_name_changes.py per generar-los)")

    # canonical -> [nom_original_API]
    canonical_to_originals: dict[str, list] = {}
    for emp in empreses:
        nom = (emp.get('nom') or '').strip()
        if not nom:
            continue
        nom_canons = all_canonicals(nom)
        # Canonics directes (nom actual tal com apareix al contracte)
        for canon in nom_canons:
            canonical_to_originals.setdefault(canon, []).append(nom)
        # Canonics d'alies historics: si l'empresa ha canviat de nom, afegim
        # tambe els canonics dels noms antics per capturar els cargos previs.
        old_canons: set = set()
        for canon_nou in nom_canons:
            old_canons.update(canonical_alias_to_old.get(canon_nou, set()))
        for canon_antic in old_canons:
            existing = canonical_to_originals.setdefault(canon_antic, [])
            if nom not in existing:
                existing.append(nom)

    print(f"  {len(empreses)} empreses -> {len(canonical_to_originals)} canonics")

    # Carrega norms unics del parquet i normalitza ambdos costats
    print("  Carregant empresa_norm unics del parquet...")
    df_norms = pd.read_parquet(PARQUET_CARGOS, columns=['empresa_norm'])
    unique_borme_norms = df_norms['empresa_norm'].dropna().unique()
    del df_norms
    print(f"  empresa_norm unics: {len(unique_borme_norms):,}  (normalitzant...)")

    # canonical -> set(borme_norms)
    canonical_to_borme: dict[str, set] = {}
    for bn in unique_borme_norms:
        for canon in all_canonicals(bn):
            canonical_to_borme.setdefault(canon, set()).add(bn)

    # Interseccio: borme_norm -> [nom_original_API]
    borme_norm_to_originals: dict[str, list] = {}
    for canon, originals in canonical_to_originals.items():
        for bn in canonical_to_borme.get(canon, set()):
            existing = borme_norm_to_originals.setdefault(bn, [])
            for orig in originals:
                if orig not in existing:
                    existing.append(orig)

    filter_borme_norms = set(borme_norm_to_originals.keys())
    print(f"  borme_norm coincidents: {len(filter_borme_norms)}")

    print("  Llegint parquet complet...")
    df = pd.read_parquet(
        PARQUET_CARGOS,
        columns=['empresa_norm', 'persona', 'cargo', 'tipo_acto', 'fecha_borme'],
    )
    print(f"  Carrecs totals: {len(df):,}")

    df = df[df['empresa_norm'].isin(filter_borme_norms)]
    print(f"  Despres de filtrar adjudicataries: {len(df):,}")

    df = df.dropna(subset=['persona', 'cargo', 'fecha_borme', 'empresa_norm'])
    df = df[df['persona'].str.strip() != '']

    # --- Purga de dades corruptes (Objecte Social extret per error) ---
    abans_purga = len(df)
    p = df['persona']
    m_len     = p.str.len() > MAX_LEN_PERSONA
    m_stop    = p.str.contains(STOP_START_PATTERN,     case=False, na=False, regex=True)
    m_objecte = p.str.contains(OBJECTE_SOCIAL_PATTERN, case=False, na=False, regex=True)
    m_ellipsis= p.str.contains(ELLIPSIS_PATTERN,       case=False, na=False, regex=True)
    m_comma   = p.str.contains(COMMA_NOSPACE_PATTERN,  case=False, na=False, regex=True)
    mask_corrupt = m_len | m_stop | m_objecte | m_ellipsis | m_comma

    # Log de purgades (amb motiu) per revisio manual
    df_purgats = df[mask_corrupt].copy()
    motius = []
    for i, _ in df_purgats.iterrows():
        rs = []
        if m_len.get(i):      rs.append('len>65')
        if m_stop.get(i):     rs.append('stop-word')
        if m_objecte.get(i):  rs.append('objecte-social')
        if m_ellipsis.get(i): rs.append('ellipsi')
        if m_comma.get(i):    rs.append('coma-comprimida')
        motius.append(','.join(rs))
    df_purgats['motius'] = motius

    purgats_out = [
        {
            'persona': r.persona,
            'empresa_norm': r.empresa_norm,
            'cargo': r.cargo,
            'motius': r.motius,
        }
        for r in df_purgats.itertuples(index=False)
    ]
    # Dedupliquem per 'persona' + 'motius' (samples repetits no aporten res)
    vistos = set()
    purgats_unics = []
    for item in purgats_out:
        k = (item['persona'], item['motius'])
        if k not in vistos:
            vistos.add(k)
            purgats_unics.append(item)
    purgats_unics.sort(key=lambda x: (x['motius'], x['persona']))

    with open(OUTPUT_PURGED, 'w', encoding='utf-8') as f:
        json.dump(purgats_unics, f, ensure_ascii=False, indent=2)

    df = df[~mask_corrupt]
    print(f"  Purga dades corruptes: -{abans_purga - len(df):,} files eliminades")
    print(f"  Log de revisio: {OUTPUT_PURGED.name} ({len(purgats_unics)} entrades uniques)")

    df['persona_key'] = df['persona'].map(normalize_persona_key)
    df['cargo_family'] = df['cargo'].map(cargo_family)
    df['_acto_rank'] = df['tipo_acto'].map(ACTO_RANK).fillna(9)
    df['_cargo_rank'] = df['cargo'].map(cargo_rank)

    df = df.sort_values(
        ['fecha_borme', '_acto_rank', '_cargo_rank'],
        ascending=[False, True, True],
        kind='mergesort',
    )
    df = df.drop_duplicates(
        subset=['empresa_norm', 'persona_key', 'cargo_family'], keep='first'
    )
    df = df[df['tipo_acto'].isin(ACTOS_ACTIUS)]
    df = df.drop(columns=['persona_key', 'cargo_family', '_acto_rank', '_cargo_rank'])
    # Nota: conservem persones juridiques valides (empreses administradores amb nom correcte).
    # La classificacio persona/empresa es fa despres via is_company_name -> tipo_entidad.
    print(f"  Administradors actius (persones + empreses): {len(df):,}")

    df['fecha_nombramiento'] = df['fecha_borme'].dt.strftime('%Y-%m-%d')
    df = df.fillna('')

    # Construeix resultat evitant duplicats per empresa
    result: dict[str, list] = {}
    for row in df.itertuples(index=False):
        for nom_original in borme_norm_to_originals.get(row.empresa_norm, []):
            admins = result.setdefault(nom_original, [])
            entry = {
                'nombre': row.persona,
                'cargo': row.cargo,
                'fecha_nombramiento': row.fecha_nombramiento,
                'tipo_entidad': 'empresa' if is_company_name(row.persona) else 'persona',
            }
            # Evitar duplicats si dos canonics han apuntat al mateix borme_norm
            if entry not in admins:
                admins.append(entry)

    for admins in result.values():
        admins.sort(key=lambda a: a['fecha_nombramiento'], reverse=True)

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    total_admins = sum(len(v) for v in result.values())
    print(
        f"\n  [OK] {OUTPUT_JSON.name} -> {len(result)} empreses amb administradors "
        f"({total_admins} registres, {len(empreses) - len(result)} sense dades)"
    )


if __name__ == '__main__':
    main()
