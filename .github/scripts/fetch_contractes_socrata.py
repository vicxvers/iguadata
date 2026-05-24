"""
fetch_contractes_socrata.py
============================
Substitueix la lectura dels fitxers Excel/JSON estàtics de /data
per una extracció dinàmica i massiva des de la API SODA 2.1 de
Dades Obertes de Catalunya (analisi.transparenciacatalunya.cat).

Resultat: sobreescriu json/contractes.json amb el MATEIX esquema
que espera la resta de l'aplicació (index.html + scripts Python
d'anàlisi), de manera que no cal modificar cap altra peça del codi.

Ús:
    python fetch_contractes_socrata.py

Opcions addicionals (variables al capdamunt del fitxer):
    OUTPUT_FILE  — ruta del JSON de sortida
    LIMIT        — registres per pàgina (màx. recomanat: 1000)
    MAX_RETRIES  — reintents en cas d'error 429 / 5xx
    RETRY_DELAY  — segons d'espera entre reintents
"""

import json
import time
import os
from datetime import datetime, date, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

# ─────────────────────────────────────────────
# CONFIGURACIÓ
# ─────────────────────────────────────────────

# Ruta de sortida: puja dos nivells des de .dev/py -> arriba a d:/Iguadata/
# .../Iguadata/.dev/py/fetch_contractes_socrata.py
#               ^----^ abspath(__file__)  -> .dev/py
#         ^---------^  dirname(...)       -> .dev
# ^-----------^        dirname(dirname()) -> Iguadata (arrel del projecte)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_FILE = os.path.join(BASE_DIR, "json", "contractes.json")
ARCHIVE_FILE = os.path.join(BASE_DIR, "json", "contractes_arxiu.json")

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

def construir_url(offset: int) -> str:
    """
    Construeix la URL completa amb la query SoQL encodada correctament.
    Filtra per:
      - organisme_contractant = "Ajuntament d'Igualada"
      - situaci_contractual IN ('adjudicació', 'menor')
    Ordena per exercici ASC, data_adjudicacio ASC.
    """
    # La clàusula $select la incloem com a text pla (no encodat aquí perquè
    # urlencode ho farà tot correctament)
    select = ", ".join(f"`{f}`" for f in SELECT_FIELDS)

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
        "`adjudicatari` ASC NULL LAST"
    )

    params = {
        "$select": select,
        "$where":  where,
        "$order":  order,
        "$limit":  LIMIT,
        "$offset": offset,
    }
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
    }


def normalitzar_text(valor) -> str:
    return " ".join(str(valor or "").strip().upper().split())


def clau_contracte_detallada(contracte: dict) -> tuple:
    """
    Clau estable per preservar expedients desapareguts sense confondre'ls amb
    duplicats exactes corregits per Socrata.
    """
    import_raw = contracte.get("importe") or 0
    try:
        import_norm = f"{float(import_raw):.2f}"
    except (TypeError, ValueError):
        import_norm = "0.00"

    return (
        normalitzar_text(contracte.get("codigo")),
        normalitzar_text(contracte.get("organismo")),
        normalitzar_text(contracte.get("fecha")),
        import_norm,
        normalitzar_text(contracte.get("adjudicatario")),
        normalitzar_text(contracte.get("descripcion"))[:180],
    )


def carregar_json_array(path: str) -> list:
    if not os.path.exists(path):
        return []
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def actualitzar_arxiu_contractes(contractes_antics: list, contractes_nous: list) -> int:
    claus_noves = {clau_contracte_detallada(c) for c in contractes_nous}
    arxiu = carregar_json_array(ARCHIVE_FILE)
    claus_arxivades = {
        clau_contracte_detallada(c.get("contracte_original", c))
        for c in arxiu
        if isinstance(c, dict)
    }

    data_arxiu = datetime.now(timezone.utc).date().isoformat()
    nous_arxivats = []
    for contracte in contractes_antics:
        clau = clau_contracte_detallada(contracte)
        if clau in claus_noves or clau in claus_arxivades:
            continue
        nous_arxivats.append({
            "estat_font": "desaparegut_socrata",
            "primera_absencia_detectada": data_arxiu,
            "font_preservacio": "json/contractes.json anterior",
            "exclos_analisis": False,
            "contracte_original": contracte,
        })
        claus_arxivades.add(clau)

    if nous_arxivats or not os.path.exists(ARCHIVE_FILE):
        arxiu.extend(nous_arxivats)
        arxiu.sort(
            key=lambda r: (
                r.get("contracte_original", {}).get("fecha") or "",
                r.get("contracte_original", {}).get("codigo") or "",
            )
        )
        with open(ARCHIVE_FILE, "w", encoding="utf-8") as f:
            json.dump(arxiu, f, ensure_ascii=False, indent=2)

    return len(nous_arxivats)


def contracte_public_preservat(registre_arxiu: dict) -> dict | None:
    contracte = registre_arxiu.get("contracte_original")
    if not isinstance(contracte, dict):
        return None

    public = dict(contracte)
    public["estat_font"] = "preservat_desaparegut_socrata"
    public["preservat_iguadata"] = True
    public["primera_absencia_detectada"] = registre_arxiu.get("primera_absencia_detectada", "")
    public["font_preservacio"] = registre_arxiu.get("font_preservacio", "")
    if registre_arxiu.get("primer_snapshot_iguadata"):
        public["primer_snapshot_iguadata"] = registre_arxiu.get("primer_snapshot_iguadata")
    return public


def fusionar_contractes_preservats(contractes_live: list) -> list:
    public = []
    claus_live = set()

    for contracte in contractes_live:
        c = dict(contracte)
        c["estat_font"] = "actiu_socrata"
        c["preservat_iguadata"] = False
        public.append(c)
        claus_live.add(clau_contracte_detallada(c))

    claus_afegides = set(claus_live)
    for registre in carregar_json_array(ARCHIVE_FILE):
        preservat = contracte_public_preservat(registre)
        if not preservat:
            continue
        clau = clau_contracte_detallada(preservat)
        if clau in claus_afegides:
            continue
        public.append(preservat)
        claus_afegides.add(clau)

    public.sort(
        key=lambda c: (
            c.get("fecha") or "",
            c.get("codigo") or "",
            c.get("adjudicatario") or "",
        ),
        reverse=True,
    )
    for idx, contracte in enumerate(public, 1):
        contracte["id"] = idx
    return public


# ─────────────────────────────────────────────
# PROGRAMA PRINCIPAL
# ─────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  IGUADATA — Extracció de contractes via Socrata SODA 2.1")
    print("=" * 60)
    print(f"  Font: {BASE_URL}")
    print(f"  Destí: {OUTPUT_FILE}")
    print()

    contractes_anteriors = carregar_json_array(OUTPUT_FILE)
    tots_els_registres_bruts = []
    offset = 0
    pagina = 1

    # ─── Bucle de paginació ───────────────────────────────────────
    while True:
        url = construir_url(offset)
        print(f"  >> Pagina {pagina:3d}  (offset={offset:6d})...", end=" ", flush=True)

        try:
            pàgina_data = fer_peticio(url)
        except Exception as exc:
            print(f"\n  ERROR fatal durant la descarrega: {exc}")
            raise

        num = len(pàgina_data)
        print(f"rebuts {num} registres")

        tots_els_registres_bruts.extend(pàgina_data)

        if num < LIMIT:
            # Última pàgina: l'API ha retornat menys de LIMIT → hem acabat
            break

        offset += LIMIT
        pagina += 1

    print()
    print(f"  Total registres descarregats: {len(tots_els_registres_bruts):,}")

    # ─── Ordenar per data descendent (el més recent primer) ──────
    # Mantenim l'ordre que espera index.html (el primer contracte de la llista
    # sol ser el més recent, igual que feia el pipeline Excel original).
    tots_els_registres_bruts.sort(
        key=lambda r: r.get("data_adjudicacio") or "",
        reverse=True
    )

    # ─── Mapeig al format intern ──────────────────────────────────
    print("  Mapejant al format intern...", end=" ", flush=True)
    contractes = [
        mapejar_registre(fila, idx + 1)
        for idx, fila in enumerate(tots_els_registres_bruts)
    ]
    print("fet.")

    arxivats = actualitzar_arxiu_contractes(contractes_anteriors, contractes)
    contractes = fusionar_contractes_preservats(contractes)

    # ─── Escriure JSON de sortida ─────────────────────────────────
    print(f"  Escrivint {OUTPUT_FILE}...", end=" ", flush=True)
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(contractes, f, ensure_ascii=False, indent=2)
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
    if os.path.exists(EMPRESES_FILE):
        try:
            with open(EMPRESES_FILE, encoding="utf-8") as f:
                old_empreses = json.load(f)
            for emp in old_empreses:
                nom = (emp.get("nom") or "").strip().upper()
                if nom:
                    classificacions_previes[nom] = {
                        "sector":    emp.get("sector", ""),
                        "categoria": emp.get("categoria", ""),
                    }
        except Exception:
            pass  # Si el fitxer és invàlid, continuem sense classificacions

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

    with open(EMPRESES_FILE, "w", encoding="utf-8") as f:
        json.dump(empreses_nova, f, ensure_ascii=False, indent=2)

    noves = sum(1 for e in empreses_nova if not e["sector"])
    print(f"  empreses.json          : {len(empreses_nova):,} empreses ({noves:,} noves sense classificar)")

    print()
    print("  OK - Proces completat correctament.")
    print("    Les noves empreses sense sector poden classificar-se amb classificar_empreses.py.")


if __name__ == "__main__":
    main()
