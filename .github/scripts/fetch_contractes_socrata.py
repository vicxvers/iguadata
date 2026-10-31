"""
fetch_contractes_socrata.py
============================
Substitueix la lectura dels fitxers Excel/JSON estàtics de /data
per una extracció dinàmica i massiva des de la API SODA 2.1 de
Dades Obertes de Catalunya (analisi.transparenciacatalunya.cat).

Resultat: actualitza json/contractes.json amb les dades de la font i
l'última fotografia dels contractes que ja no hi estan disponibles.

Ús:
    python fetch_contractes_socrata.py

Opcions addicionals (variables al capdamunt del fitxer):
    OUTPUT_FILE  — ruta del JSON de sortida
    LIMIT        — registres per pàgina (màx. recomanat: 1000)
    MAX_RETRIES  — reintents en cas d'error 429 / 5xx
    RETRY_DELAY  — segons d'espera entre reintents
"""

import argparse
import json
import time
import os
from datetime import datetime, date, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

from atomic_io import write_json_atomic
from contract_audit import change_id, contract_differences, detailed_key
from contract_filters import is_analysis_contract, is_live_contract
from contract_history import contract_key, merge_snapshot

# ─────────────────────────────────────────────
# CONFIGURACIÓ
# ─────────────────────────────────────────────

# Font mantinguda a .github/scripts/; les sortides parteixen de l'arrel.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_FILE = os.path.join(BASE_DIR, "json", "contractes.json")
ARCHIVE_FILE = os.path.join(BASE_DIR, ".github", "audit", "contractes_arxiu.json")
CHANGELOG_FILE = os.path.join(BASE_DIR, ".github", "audit", "canvis_contractes.json")

# Endpoint Socrata – dataset hb6v-jcbf (Registre de Contractes de Catalunya)
BASE_URL = "https://analisi.transparenciacatalunya.cat/resource/hb6v-jcbf.json"

# Autenticació (App Token)
APP_TOKEN = "eolLs4uJArZvmZVTVUfJN8d3Y"

# Paràmetres de paginació
LIMIT = 1000        # Socrata permet fins a 50.000 però recomanem 1.000 per compatibilitat

# Paràmetres de reintent per errors 429 / 5xx
MAX_RETRIES = 5
RETRY_DELAY = 2     # segons

# Camps que volem recuperar de l'API
SELECT_FIELDS = [
    "situaci_contractual",
    "exercici",
    "subjecte_ambit",
    "id_agrupacio_organisme",
    "agrupacio_organisme",
    "id_organisme_contractant",
    "organisme_contractant",
    "codi_expedient",
    "procediment_adjudicacio",
    "tipus_contracte",
    "descripcio_expedient",
    "numero_lot",
    "codi_cpv",
    "adjudicatari",
    "import_adjudicacio",
    "data_adjudicacio",
    "contracte",
    "lot_desert",
    "dies_durada",
    "mesos_durada",
    "anys_durada",
    "numero_prorroga",
    "data_inici_prorroga",
    "data_fi_prorroga",
    "numero_modificacio",
    "tipus_modificacio",
    "import_modificacio",
    "data_aprovacio_modificacio",
    "anys_termini_modificacio",
    "mesos_termini_modificacio",
    "dies_termini_modificacio",
    "tipus_liquidacio",
    "data_liquidacio",
    "causa_resolucio",
    "import_liquidacio",
]

# ─────────────────────────────────────────────
# FUNCIONS AUXILIARS
# ─────────────────────────────────────────────

def construir_url(offset: int, *, count_only: bool = False) -> str:
    """
    Construeix la URL completa amb la query SoQL encodada correctament.
    Filtra per:
      - organisme_contractant = "Ajuntament d'Igualada"
      - situaci_contractual IN ('adjudicació', 'menor')
    Ordena per exercici ASC, data_adjudicacio ASC.
    """
    # La clàusula $select la incloem com a text pla (no encodat aquí perquè
    # urlencode ho farà tot correctament)
    select = ":id AS id_socrata, " + ", ".join(f"`{f}`" for f in SELECT_FIELDS)

    # Condicions SoQL – inclou l'Ajuntament i tots els organismes municipals vinculats
    organismes = [
        "Ajuntament d'Igualada",
        "Igualada en Acció",
        "Consorci de Gestió Aeròdrom General Vives d'Igualada-Òdena",
        "Consorci per a la gestió de la televisió digital local de demarcació d'igualada",
        "Organisme Autònom Municipal d'Ensenyaments Artístics d'Igualada",
        "Terrenys Av. Catalunya d'Igualada, SA",
        "Consorci Sociosanitari d'Igualada",
        "Promotora Igualadina Municipal d'Habitatges, SL (PIMHA)",
        "Societat Igualadina Municipal d'Aparcaments, SL",
    ]
    org_list = ", ".join(f'"{o}"' for o in organismes)
    where = (
        f"caseless_one_of(`organisme_contractant`, {org_list}) "
        "AND caseless_one_of(`situaci_contractual`, \"adjudicació\", \"menor\")"
    )

    order = (
        "`exercici` ASC NULL LAST, "
        "`data_adjudicacio` ASC NULL LAST, "
        "`codi_expedient` ASC NULL LAST, "
        "`adjudicatari` ASC NULL LAST, :id ASC"
    )

    params = {
        "$select": select,
        "$where":  where,
        "$order":  order,
        "$limit":  LIMIT,
        "$offset": offset,
    }
    if count_only:
        params = {"$select": "count(*) AS total", "$where": where}
    return f"{BASE_URL}?{urlencode(params)}"


def fer_peticio(url: str) -> list:
    """
    Fa una petició GET a la URL donada amb el App Token als headers.
    Reintenta automàticament davant errors 429 (rate limit) i 5xx (servidor).
    """
    headers = {
        "X-App-Token": APP_TOKEN,
        "Accept": "application/json",
    }

    for intent in range(1, MAX_RETRIES + 1):
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=120) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body)

        except HTTPError as e:
            codi_http = e.code
            if codi_http == 429 or codi_http >= 500:
                print(f"\n  WARNING: Error HTTP {codi_http} (intent {intent}/{MAX_RETRIES}). "
                      f"Esperant {RETRY_DELAY} s...")
                time.sleep(RETRY_DELAY)
            else:
                # Errors 4xx que no siguin 429 (ex: 400, 401, 403) -> fallo immediatament
                print(f"\n  ERROR HTTP {codi_http}: {e.reason}. Comproveu l'endpoint i el token.")
                raise

        except (URLError, TimeoutError, OSError) as e:
            # Inclou: timeout de socket, errors de connexio, etc.
            motiu = getattr(e, 'reason', str(e))
            print(f"\n  WARNING: Error de xarxa (intent {intent}/{MAX_RETRIES}): {motiu}")
            if intent < MAX_RETRIES:
                time.sleep(RETRY_DELAY)
            else:
                raise

    raise RuntimeError(f"No s'ha pogut completar la petició després de {MAX_RETRIES} intents.")


# ─────────────────────────────────────────────
# FUNCIÓ DE MAPEIG
# ─────────────────────────────────────────────

def mapejar_registre(fila: dict, index_id: int) -> dict:
    """
    Transforma un registre brut de la API Socrata (camps en català)
    al format intern de l'aplicació (camps en castellà), que és el que
    llegeix index.html i tots els scripts Python d'anàlisi.

    Esquema intern esperat:
        id          : int   – comptador seqüencial (1-indexed)
        codigo      : str   – codi d'expedient
        organismo   : str   – organisme contractant
        tipo        : str   – tipus de contracte
        procedimiento: str  – procediment d'adjudicació
        descripcion : str   – descripció de l'expedient
        importe     : float – import d'adjudicació (€)
        adjudicatario: str  – empresa adjudicatària
        fecha       : str   – data YYYY-MM-DD
        año         : int   – any (exercici)
        mes         : int   – mes (derivat de data_adjudicacio)
    """
    # --- Import (pot venir com a string o float/int) ---
    import_raw = fila.get("import_adjudicacio")
    try:
        importe = float(import_raw) if import_raw not in (None, "", "nan") else 0.0
    except (ValueError, TypeError):
        importe = 0.0

    # --- Data d'adjudicació ---
    data_raw = fila.get("data_adjudicacio", "")
    fecha = ""
    mes = None
    if data_raw:
        # Socrata retorna el camp en format ISO 8601: "YYYY-MM-DDThh:mm:ss.mmm"
        # Retallem fins a la part de data
        try:
            dt = datetime.fromisoformat(data_raw[:10])
            fecha = dt.strftime("%Y-%m-%d")
            mes = dt.month
        except ValueError:
            fecha = data_raw[:10] if len(data_raw) >= 10 else data_raw
            mes = None

    # --- Any (exercici) ---
    exercici_raw = fila.get("exercici")
    try:
        any_ = int(exercici_raw) if exercici_raw not in (None, "") else None
    except (ValueError, TypeError):
        any_ = None

    # Si exercici és None però tenim data, el derivem de la data
    if any_ is None and fecha and len(fecha) >= 4:
        try:
            any_ = int(fecha[:4])
        except ValueError:
            any_ = None

    return {
        "id":           index_id,
        "codigo":       (fila.get("codi_expedient") or "").strip(),
        "organismo":    (fila.get("organisme_contractant") or "").strip(),
        "tipo":         (fila.get("tipus_contracte") or "").strip(),
        "procedimiento": (fila.get("procediment_adjudicacio") or "").strip(),
        "descripcion":  (fila.get("descripcio_expedient") or "").strip(),
        "importe":      importe,
        "adjudicatario":(fila.get("adjudicatari") or "").strip().upper(),
        "fecha":        fecha,
        "año":          any_,
        "mes":          mes,
        "cpv":          (fila.get("codi_cpv") or "").strip(),
        "numero_lot":   (fila.get("numero_lot") or "").strip(),
        "contracte_origen": (fila.get("contracte") or "").strip(),
        "id_socrata": str(fila.get("id_socrata") or ""),
    }


def carregar_json_array(path: str) -> list:
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list) or any(not isinstance(row, dict) for row in data):
        raise ValueError(f"{path} no és un array de registres vàlid")
    return data


def actualitzar_arxiu_contractes(contractes_antics: list, contractes_nous: list) -> int:
    old_live = [
        contract
        for contract in contractes_antics
        if is_analysis_contract(contract)
    ]
    new_exact = {detailed_key(contract) for contract in contractes_nous}
    new_by_identity = {}
    new_by_source = {str(row["id_socrata"]): row for row in contractes_nous if row.get("id_socrata")}
    for contract in contractes_nous:
        key = contract_key(contract)
        if key:
            new_by_identity.setdefault(key, []).append(contract)

    arxiu = carregar_json_array(ARCHIVE_FILE)
    canvis = carregar_json_array(CHANGELOG_FILE)
    canvis_by_id = {
        row.get("id"): row
        for row in canvis
        if isinstance(row, dict) and row.get("id")
    }

    data_deteccio = datetime.now(timezone.utc).date().isoformat()
    arxiu_modificat = False

    # Migrate the historical archive to the explicit audit-event schema.
    for registre in arxiu:
        if not isinstance(registre, dict):
            continue
        original = registre.get("contracte_original")
        if not isinstance(original, dict):
            continue
        tipus = registre.get("tipus_canvi") or "desaparegut"
        detected = (
            registre.get("detectat_a")
            or registre.get("primera_absencia_detectada")
            or data_deteccio
        )
        identifier = registre.get("canvi_id") or change_id(
            tipus, original, registre.get("contracte_nou")
        )
        migration = {
            "id": identifier,
            "tipus_canvi": tipus,
            "detectat_a": detected,
            "contracte_anterior": original,
            "contracte_nou": registre.get("contracte_nou"),
            "camps_modificats": registre.get("camps_modificats", []),
            "alertes_afectades": [],
            "investigacions_afectades": [],
            "impacte_calculat": False,
        }
        if identifier not in canvis_by_id:
            canvis.append(migration)
            canvis_by_id[identifier] = migration
        if registre.get("exclos_analisis") is not True:
            registre["exclos_analisis"] = True
            arxiu_modificat = True
        for key, value in (
            ("tipus_canvi", tipus),
            ("detectat_a", detected),
            ("canvi_id", identifier),
        ):
            if registre.get(key) != value:
                registre[key] = value
                arxiu_modificat = True

    nous_esdeveniments = 0
    for contracte in old_live:
        key = detailed_key(contracte)
        if key in new_exact:
            continue

        candidates = new_by_identity.get(contract_key(contracte), [])
        if not candidates and contracte.get("id_socrata"):
            source_match = new_by_source.get(str(contracte["id_socrata"]))
            candidates = [source_match] if source_match else []
        # Ignore schema-only backfills and exact semantic matches.
        if any(not contract_differences(contracte, candidate) for candidate in candidates):
            continue
        contracte_nou = candidates[0] if len(candidates) == 1 else None
        differences = (
            contract_differences(contracte, contracte_nou)
            if contracte_nou
            else []
        )
        tipus = "modificat" if contracte_nou and differences else "desaparegut"
        identifier = change_id(tipus, contracte, contracte_nou)
        if identifier in canvis_by_id:
            continue

        registre = {
            "estat_font": "versio_anterior_socrata",
            "tipus_canvi": tipus,
            "detectat_a": data_deteccio,
            "primera_absencia_detectada": data_deteccio,
            "font_preservacio": "json/contractes.json anterior",
            "exclos_analisis": True,
            "canvi_id": identifier,
            "contracte_original": contracte,
            "contracte_nou": contracte_nou,
            "camps_modificats": differences,
        }
        arxiu.append(registre)
        arxiu_modificat = True

        if identifier not in canvis_by_id:
            canvi = {
                "id": identifier,
                "tipus_canvi": tipus,
                "detectat_a": data_deteccio,
                "contracte_anterior": contracte,
                "contracte_nou": contracte_nou,
                "camps_modificats": differences,
                "alertes_afectades": [],
                "investigacions_afectades": [],
                "impacte_calculat": False,
            }
            canvis.append(canvi)
            canvis_by_id[identifier] = canvi
        nous_esdeveniments += 1

    if arxiu_modificat or not os.path.exists(ARCHIVE_FILE):
        arxiu.sort(
            key=lambda row: (
                row.get("detectat_a") or row.get("primera_absencia_detectada") or "",
                row.get("contracte_original", {}).get("fecha") or "",
                row.get("contracte_original", {}).get("codigo") or "",
            )
        )
        write_json_atomic(ARCHIVE_FILE, arxiu)

    canvis.sort(key=lambda row: (row.get("detectat_a") or "", row.get("id") or ""))
    write_json_atomic(CHANGELOG_FILE, canvis)
    return nous_esdeveniments


# ─────────────────────────────────────────────
# PROGRAMA PRINCIPAL
# ─────────────────────────────────────────────

def comptar_registres() -> int:
    response = fer_peticio(construir_url(0, count_only=True))
    if not isinstance(response, list) or len(response) != 1:
        raise RuntimeError("Recompte Socrata invàlid")
    total = int(response[0]["total"])
    if total <= 0:
        raise RuntimeError("Socrata no retorna contractes; es conserva la fotografia anterior")
    return total


def descarregar_contractes() -> list[dict]:
    expected = comptar_registres()
    rows = []
    seen = set()
    offset = 0
    while True:
        page = fer_peticio(construir_url(offset))
        if not isinstance(page, list) or any(not isinstance(row, dict) for row in page):
            raise RuntimeError("Pàgina Socrata invàlida")
        for row in page:
            source_id = row.get("id_socrata")
            if not source_id or source_id in seen:
                raise RuntimeError("Paginació Socrata inconsistent: identificador absent o repetit")
            seen.add(source_id)
        rows.extend(page)
        print(f"  >> Offset {offset}: {len(page)} registres")
        if len(page) < LIMIT:
            break
        offset += LIMIT
    if len(rows) != expected or comptar_registres() != expected:
        raise RuntimeError("Descàrrega Socrata incompleta o modificada durant la paginació")
    rows.sort(key=lambda row: row.get("data_adjudicacio") or "", reverse=True)
    return [mapejar_registre(row, index + 1) for index, row in enumerate(rows)]


def main():
    parser = argparse.ArgumentParser(description="Actualitza la fotografia contractual i conserva l'històric.")
    parser.add_argument("--migrate-history", action="store_true",
                        help="Incorpora originals desapareguts a la fotografia local, sense descarregar dades.")
    args = parser.parse_args()
    print("=" * 60)
    print("  IGUADATA — Extracció de contractes via Socrata SODA 2.1")
    print("=" * 60)
    print(f"  Font: {BASE_URL}")
    print(f"  Destí: {OUTPUT_FILE}")
    print()

    contractes_anteriors = carregar_json_array(OUTPUT_FILE)
    legacy_archive = carregar_json_array(ARCHIVE_FILE)
    carregar_json_array(CHANGELOG_FILE)
    previous_companies = carregar_json_array(os.path.join(BASE_DIR, "json", "empreses.json"))
    if args.migrate_history:
        fresh = [dict(row) for row in contractes_anteriors if is_live_contract(row)]
        observed_on = None
        arxivats = 0
    else:
        fresh = descarregar_contractes()
        observed_on = datetime.now(timezone.utc).date().isoformat()
        arxivats = actualitzar_arxiu_contractes(contractes_anteriors, fresh)
    contractes = merge_snapshot(contractes_anteriors, fresh, observed_on=observed_on,
                               legacy_archive=legacy_archive)

    # ─── Escriure JSON de sortida ─────────────────────────────────
    print(f"  Escrivint {OUTPUT_FILE}...", end=" ", flush=True)
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    write_json_atomic(OUTPUT_FILE, contractes)
    print("fet.")

    # ─── Resum ───────────────────────────────────────────────────
    anys = sorted({c["año"] for c in contractes if c["año"]})
    import_total = sum(c["importe"] for c in contractes)
    menors = sum(1 for c in contractes if "menor" in (c.get("procedimiento") or "").lower())
    adjudicats = len(contractes) - menors
    num_empresas = len({c["adjudicatario"] for c in contractes if c["adjudicatario"]})

    print()
    print(f"  {'=' * 56}")
    print(f"  RESUM FINAL")
    print(f"  {'=' * 56}")
    print(f"  Contractes totals      : {len(contractes):>8,}")
    print(f"    - Menors             : {menors:>8,}")
    print(f"    - Adjudicats         : {adjudicats:>8,}")
    print(f"  Import total           : {import_total:>14,.2f} EUR")
    print(f"  Empreses uniques       : {num_empresas:>8,}")
    print(f"  Exercicis coberts      : {', '.join(str(a) for a in anys)}")
    print(f"  Fitxer generat         : {OUTPUT_FILE}")
    print(f"  Arxiu preservacio      : {ARCHIVE_FILE} (+{arxivats:,})")
    print(f"  {'=' * 56}")

    # ─── Generar empreses.json ────────────────────────────────────
    # Agrupa els contractes per empresa (adjudicatario) i genera
    # l'estructura que espera index.html i els scripts d'anàlisi.
    # Preserva els camps sector/categoria ja classificats
    # (de classificacions manuals + enrich_empreses.py) del fitxer anterior.
    EMPRESES_FILE = os.path.join(BASE_DIR, "json", "empreses.json")

    # Carregar classificacions existents (sector/categoria) per empresa
    classificacions_previes = {}
    for emp in previous_companies:
        nom = (emp.get("nom") or "").strip().upper()
        if nom:
            classificacions_previes[nom] = {
                "sector": emp.get("sector", ""),
                "categoria": emp.get("categoria", ""),
            }

    # Agrupar contractes per empresa
    from collections import defaultdict
    grups = defaultdict(list)
    import_per_id = {c["id"]: c["importe"] for c in contractes}  # O(n) lookup
    for c in contractes:
        nom = (c.get("adjudicatario") or "").strip().upper()
        if nom:
            grups[nom].append(c["id"])

    empreses_nova = []
    for nom, ids in sorted(grups.items(), key=lambda x: -len(x[1])):
        import_empresa = sum(import_per_id.get(i, 0) for i in ids)
        prev = classificacions_previes.get(nom.upper(), {})
        empreses_nova.append({
            "nom":          nom,
            "num_contratos": len(ids),
            "total_importe": round(import_empresa, 2),
            "contratos":    sorted(ids),
            "sector":       prev.get("sector", ""),
            "categoria":    prev.get("categoria", ""),
        })

    write_json_atomic(EMPRESES_FILE, empreses_nova)

    noves = sum(1 for e in empreses_nova if not e["sector"])
    print(f"  empreses.json          : {len(empreses_nova):,} empreses ({noves:,} noves sense classificar)")

    print()
    print("  OK - Proces completat correctament.")
    print("    Les noves empreses sense sector poden classificar-se amb classificar_empreses.py.")


if __name__ == "__main__":
    main()
