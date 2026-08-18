"""Descarrega setmanalment les concessions RAISC de l'Ajuntament d'Igualada."""

import json
import os
import re
import time
import unicodedata
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from atomic_io import write_json_atomic


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PUBLIC_FILE = os.path.join(BASE_DIR, "json", "subvencions.json")
INTERNAL_FILE = os.path.join(BASE_DIR, ".github", "data", "subvencions_raisc.json")
BASE_URL = "https://analisi.transparenciacatalunya.cat/resource/s9xt-n979.json"
APP_TOKEN = "eolLs4uJArZvmZVTVUfJN8d3Y"
LIMIT = 1000
MAX_RETRIES = 5
RETRY_DELAY = 2

SELECT_FIELDS = [
    "clau", "entitat_oo_aa_o_departament", "entitat_oo_aa_o_departament_1",
    "codi_raisc", "codi_bdns", "discriminador_de_la_concessi",
    "any_de_la_convocat_ria", "objecte_de_la_convocat_ria",
    "t_tol_convocat_ria_catal", "t_tol_convocat_ria_castell",
    "diari_oficial_de_publicaci", "bases_reguladores_url_catal",
    "bases_reguladores_url_castell", "subfinalitat_codi", "subfinalitat",
    "finalitat_rais_codi", "finalitat_rais", "finalitat_p_blica_codi",
    "finalitat_p_blica", "tipus_d_instument_d_ajut",
    "tipus_d_instument_d_ajut_1", "aplicaci_pressupost_ria",
    "tipus_de_beneficiaris_codi", "tipus_de_beneficiaris",
    "cif_beneficiari", "ra_social_del_beneficiari", "codi_territorial",
    "ajut_d_estat", "ajut_d_estat_mecanisme_d_autoritzaci_codi",
    "ajut_d_estat_mecanisme_d_autoritzaci_", "ajut_d_estat_reglament_ue",
    "ajut_d_estat_reglament_ue_1", "ajut_d_estat_refer_ncia_ue",
    "ajut_d_estat_objectius_del", "ajut_d_estat_objectius_del_1",
    "data_concessi", "import_subvenci_pr_stec_ajut",
    "import_ajuda_equivalent", "administraci_codi", "administraci_",
    "departament_o_entitat_local_d_adscripci_codi",
    "departament_o_entitat_local_d_adscripci_",
]

HIDDEN_BENEFICIARIES = {"benef. no publicable", "persona fisica"}


def build_url(offset: int) -> str:
    params = {
        "$select": ", ".join(f"`{field}`" for field in SELECT_FIELDS),
        "$where": "upper(`entitat_oo_aa_o_departament_1`) = upper(\"Ajuntament d'Igualada\")",
        "$order": "`data_concessi` DESC NULL LAST, `clau` ASC NULL LAST",
        "$limit": LIMIT,
        "$offset": offset,
    }
    return f"{BASE_URL}?{urlencode(params)}"


def request_rows(url: str) -> list:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            request = Request(url, headers={"X-App-Token": APP_TOKEN, "Accept": "application/json"})
            with urlopen(request, timeout=120) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if not isinstance(payload, list):
                raise RuntimeError("La resposta RAISC no és una llista")
            return payload
        except HTTPError as error:
            if error.code != 429 and error.code < 500:
                raise
            if attempt == MAX_RETRIES:
                raise
        except (URLError, TimeoutError, OSError):
            if attempt == MAX_RETRIES:
                raise
        time.sleep(RETRY_DELAY)
    raise RuntimeError("No s'ha pogut completar la descàrrega RAISC")


def normalized_label(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    return "".join(char for char in text if unicodedata.category(char) != "Mn").strip().lower()


def slugify(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "entitat"


def is_public(row: dict) -> bool:
    beneficiary = normalized_label(row.get("ra_social_del_beneficiari"))
    beneficiary_id = normalized_label(row.get("cif_beneficiari"))
    return bool(beneficiary) and beneficiary not in HIDDEN_BENEFICIARIES and beneficiary_id not in HIDDEN_BENEFICIARIES


def parse_amount(value: object) -> float:
    try:
        return float(str(value or "0").replace(",", "."))
    except (TypeError, ValueError):
        return 0.0


def public_row(row: dict, index: int) -> dict:
    date_raw = str(row.get("data_concessi") or "")
    date_value = date_raw[:10]
    try:
        year = datetime.fromisoformat(date_value).year
    except ValueError:
        year = None
    beneficiary = str(row.get("ra_social_del_beneficiari") or "").strip()
    result = dict(row)
    result.update({
        "id": row.get("clau") or f"{row.get('codi_raisc') or 'subvencio'}-{index}",
        "descripcion": str(row.get("objecte_de_la_convocat_ria") or "Subvenció sense descripció").strip(),
        "importe": parse_amount(row.get("import_subvenci_pr_stec_ajut")),
        "adjudicatario": beneficiary,
        "fecha": date_value,
        "año": year,
        "codigo": str(row.get("codi_raisc") or "").strip(),
        "entitat_slug": slugify(beneficiary),
    })
    return result


def main() -> None:
    all_rows = []
    offset = 0
    while True:
        page = request_rows(build_url(offset))
        all_rows.extend(page)
        print(f"RAISC: {len(all_rows)} registres")
        if len(page) < LIMIT:
            break
        offset += LIMIT

    public_rows = [public_row(row, index) for index, row in enumerate(all_rows, start=1) if is_public(row)]
    os.makedirs(os.path.dirname(INTERNAL_FILE), exist_ok=True)
    write_json_atomic(INTERNAL_FILE, all_rows)
    write_json_atomic(PUBLIC_FILE, public_rows)
    print(f"Desats {len(all_rows)} registres interns i {len(public_rows)} subvencions públiques")


if __name__ == "__main__":
    main()
