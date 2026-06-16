#!/usr/bin/env python3
"""
Genera json/electoralisme.json a partir dels contractes adjudicats dins dels
períodes electorals municipals i de la seva recurrència històrica.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import unicodedata
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
CONTRACTES_FILE = BASE_DIR / "json" / "contractes.json"
OUTPUT_FILE = BASE_DIR / "json" / "electoralisme.json"

MUNICIPAL_ELECTION_DATES = [
    date(2011, 5, 22),
    date(2015, 5, 24),
    date(2019, 5, 26),
    date(2023, 5, 28),
    date(2027, 5, 30),
]
ELECTORAL_PERIOD_DAYS = 54
PRE_ELECTORAL_WINDOW_DAYS = 54
POST_ELECTORAL_WINDOW_DAYS = 54
CAMPAIGN_START_DAYS_BEFORE_VOTE = 16

STOPWORDS = {
    "a", "amb", "de", "del", "dels", "el", "els", "en", "i", "la", "les",
    "per", "un", "una", "uns", "unes", "al", "als", "l", "d", "que", "pel",
    "pels", "contractacio", "contracte", "servei", "serveis", "subministrament",
    "subministraments", "ajuntament", "igualada", "municipal", "corresponent",
    "any", "realitzacio", "execucio",
}

SENSITIVE_TERMS = {
    "comunicacio": 16,
    "difusio": 16,
    "publicitat": 18,
    "publicitaria": 18,
    "campanya": 18,
    "informativa": 8,
    "anunci": 14,
    "anuncis": 14,
    "mitjans": 14,
    "premsa": 14,
    "radio": 14,
    "televisio": 14,
    "video": 12,
    "videos": 12,
    "audiovisual": 12,
    "fotografia": 10,
    "fotografic": 10,
    "disseny": 12,
    "grafic": 12,
    "retolacio": 10,
    "retol": 12,
    "retols": 12,
    "monolit": 12,
    "monolits": 12,
    "senyalitzacio": 12,
    "senyaletica": 12,
    "vinil": 10,
    "vinils": 10,
    "lona": 12,
    "lones": 12,
    "banderola": 12,
    "banderoles": 12,
    "photocall": 12,
    "marxandatge": 10,
    "impressio": 12,
    "cartell": 12,
    "cartells": 12,
    "fullet": 12,
    "fulleto": 12,
    "triptic": 12,
    "revista": 10,
    "opuscle": 10,
    "xarxes": 14,
    "socials": 8,
    "web": 8,
    "presentacio": 12,
    "inauguracio": 20,
    "acte": 8,
    "actes": 8,
    "esdeveniment": 8,
}

NEUTRALITY_RISK_TERMS = {
    "assoliment": 18,
    "assoliments": 18,
    "logro": 18,
    "logros": 18,
    "balanc": 16,
    "resultats": 12,
    "millora": 12,
    "millores": 12,
    "nou": 8,
    "nova": 8,
    "ampliacio": 10,
    "estrena": 12,
    "obertura": 12,
    "posada": 10,
    "marxa": 10,
    "finalitzada": 12,
    "finalitzacio": 12,
    "promocio": 16,
    "promoure": 16,
}

PHYSICAL_SUPPORT_TERMS = {
    "retol", "retols", "retolacio", "monolit", "monolits", "senyalitzacio",
    "senyaletica", "vinil", "vinils", "lona", "lones", "banderola",
    "banderoles", "photocall", "cartell", "cartells",
}

PROJECT_SHOWCASE_TERMS = {
    "ampliacio", "estrena", "obertura", "nou", "nova", "millora", "millores",
    "posada", "inauguracio",
}

ATTENUANT_TERMS = {
    "emergencia", "urgent", "covid", "sanitaria", "salut", "seguretat",
    "proteccio civil", "avis", "edictes", "notificacio", "termini",
    "obligatori", "obligatoria", "exposicio publica", "licitacio",
}

TOKEN_RE = re.compile(r"[a-z0-9]{3,}")


def fold(value: str) -> str:
    value = (value or "").upper().replace("Ñ", "##ENIE##")
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return value.replace("##ENIE##", "Ñ")


def norm_text(value: str) -> str:
    value = fold(value).lower()
    value = re.sub(r"[^a-z0-9ñ]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def norm_company(value: str) -> str:
    value = fold(value)
    value = re.sub(r"\b(SOCIEDAD|LIMITADA|ANONIMA|UNIPERSONAL|SLU|S\.L\.U\.|S\.L\.|SL|SA|S\.A\.|SAU|S\.A\.U\.)\b", "", value)
    value = re.sub(r"[^A-ZÑ0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def tokens(text: str) -> set[str]:
    return {t for t in TOKEN_RE.findall(norm_text(text)) if t not in STOPWORDS}


def similarity(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    return inter / math.sqrt(len(a) * len(b)) if inter else 0.0


def parse_date(value: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def stable_contract_key(c: dict) -> str:
    code = re.sub(r"\s+", " ", str(c.get("codigo") or "")).strip()
    if code:
        parts = [code, c.get("fecha"), c.get("importe")]
    else:
        parts = [c.get("fecha"), c.get("importe"), c.get("adjudicatario")]
    return "|".join("" if v is None else str(v).strip() for v in parts)


def stable_case_id(prefix: str, kind: str, c: dict) -> str:
    signature = f"{kind}|{stable_contract_key(c)}"
    digest = hashlib.sha1(signature.encode("utf-8")).hexdigest()[:10].upper()
    return f"{prefix}-{digest}"


def election_windows() -> list[dict]:
    windows = []
    for vote in MUNICIPAL_ELECTION_DATES:
        start = vote - timedelta(days=ELECTORAL_PERIOD_DAYS)
        campaign_start = vote - timedelta(days=CAMPAIGN_START_DAYS_BEFORE_VOTE)
        windows.append({
            "any": vote.year,
            "data_inici_finestra_previa": start - timedelta(days=PRE_ELECTORAL_WINDOW_DAYS),
            "data_convocatoria": start,
            "data_votacio": vote,
            "data_fi_finestra_posterior": vote + timedelta(days=POST_ELECTORAL_WINDOW_DAYS),
            "data_inici_campanya": campaign_start,
            "data_reflexio": vote - timedelta(days=1),
        })
    return windows


def window_for(d: date) -> dict | None:
    for window in election_windows():
        if window["data_inici_finestra_previa"] <= d <= window["data_fi_finestra_posterior"]:
            return window
    return None


def in_same_calendar_window(d: date, window: dict) -> bool:
    start = window["data_convocatoria"]
    end = window["data_votacio"]
    current = (d.month, d.day)
    return (start.month, start.day) <= current <= (end.month, end.day)


def term_score(text: str, dictionary: dict[str, int]) -> tuple[int, list[str]]:
    normalized = f" {norm_text(text)} "
    score = 0
    matched = []
    for term, weight in dictionary.items():
        if f" {term} " in normalized:
            score += weight
            matched.append(term)
    return score, matched


def has_attenuant(text: str) -> list[str]:
    normalized = f" {norm_text(text)} "
    return [term for term in ATTENUANT_TERMS if f" {term} " in normalized]


def is_minor(c: dict) -> bool:
    return "MENOR" in fold(c.get("procedimiento", ""))


def risk_label(score: int) -> str:
    if score >= 85:
        return "CRITIC"
    if score >= 65:
        return "ALT"
    if score >= 40:
        return "OBSERVACIO"
    return "BAIX"


def enrich_contract(c: dict) -> dict | None:
    d = parse_date(c.get("fecha", ""))
    if not d:
        return None
    sensitive_score, sensitive_terms = term_score(c.get("descripcion", ""), SENSITIVE_TERMS)
    neutrality_score, neutrality_terms = term_score(c.get("descripcion", ""), NEUTRALITY_RISK_TERMS)
    clean = dict(c)
    clean["_date"] = d
    clean["_company_norm"] = norm_company(c.get("adjudicatario", ""))
    clean["_tokens"] = tokens(c.get("descripcion", ""))
    clean["_sensitive_score"] = sensitive_score
    clean["_sensitive_terms"] = sensitive_terms
    clean["_neutrality_score"] = neutrality_score
    clean["_neutrality_terms"] = neutrality_terms
    clean["_attenuants"] = has_attenuant(c.get("descripcion", ""))
    return clean


def recurrence(c: dict, rows: list[dict], window: dict) -> dict:
    election_years = {w["any"] for w in election_windows()}
    comparable = [
        other for other in rows
        if other["_date"].year not in election_years
        and in_same_calendar_window(other["_date"], window)
        and other["_sensitive_score"] >= 12
    ]
    same_company = [other for other in comparable if other["_company_norm"] == c["_company_norm"]]
    similar = [
        other for other in same_company
        if similarity(c["_tokens"], other["_tokens"]) >= 0.45
    ]
    amounts = [float(other.get("importe") or 0) for other in comparable]
    company_amounts = [float(other.get("importe") or 0) for other in same_company]
    return {
        "comparables": len(comparable),
        "mateixa_empresa": len(same_company),
        "objecte_similar": len(similar),
        "mitjana_import_window": round(sum(amounts) / len(amounts), 2) if amounts else 0,
        "mitjana_import_empresa": round(sum(company_amounts) / len(company_amounts), 2) if company_amounts else 0,
    }


def score_case(c: dict, window: dict, rec: dict) -> tuple[int, list[str]]:
    vote = window["data_votacio"]
    days_to_vote = (vote - c["_date"]).days
    amount = float(c.get("importe") or 0)
    is_project_showcase = (
        bool(set(c["_sensitive_terms"]) & PHYSICAL_SUPPORT_TERMS)
        and bool(set(c["_sensitive_terms"] + c["_neutrality_terms"]) & PROJECT_SHOWCASE_TERMS)
    )

    score = 0
    motius = []
    if c["_date"] < window["data_convocatoria"]:
        days_before_call = (window["data_convocatoria"] - c["_date"]).days
        if days_before_call <= 30:
            score += 18
            motius.append("Adjudicació dins la finestra administrativa prèvia")
        else:
            score += 12
            motius.append("Adjudicació dins la finestra administrativa ampliada prèvia")
        motius.append("Possible formalització anticipada d'un servei executat en període electoral")
    elif c["_date"] > vote:
        days_after_vote = (c["_date"] - vote).days
        if days_after_vote <= 30:
            score += 20
            motius.append("Adjudicació dins la finestra administrativa posterior")
        else:
            score += 14
            motius.append("Adjudicació dins la finestra administrativa ampliada")
        motius.append("Possible formalització posterior d'un servei executat en període electoral")
    elif c["_date"] >= window["data_reflexio"]:
        score += 34
        motius.append("Adjudicació en jornada de reflexió o votació")
    elif c["_date"] >= window["data_inici_campanya"]:
        score += 30
        motius.append("Adjudicació durant la campanya electoral estricta")
    elif days_to_vote <= 30:
        score += 22
        motius.append("Adjudicació a menys de 30 dies de la votació")
    else:
        score += 14
        motius.append("Adjudicació dins del període electoral municipal")

    if c["_sensitive_score"] >= 28:
        score += 25
        motius.append("Objecte contractual directament vinculat a comunicació o difusió institucional")
    elif c["_sensitive_score"] >= 16:
        score += 18
        motius.append("Objecte contractual sensible en període electoral")
    else:
        score += 10
        motius.append("Objecte contractual parcialment compatible amb comunicació institucional")

    if c["_neutrality_score"] >= 20:
        score += 20
        motius.append("Objecte amb conceptes incompatibles amb la neutralitat electoral")
    elif c["_neutrality_score"] > 0:
        score += 10
        motius.append("Objecte amb possibles elements promocionals")

    if is_minor(c):
        score += 10
        motius.append("Adjudicació mitjançant procediment menor")

    avg_company = rec["mitjana_import_empresa"] or rec["mitjana_import_window"]
    if avg_company and amount >= avg_company * 2 and amount >= 1000:
        score += 14
        motius.append("Import superior al patró comparable d'anys no electorals")
    elif avg_company and amount >= avg_company * 1.35 and amount >= 1000:
        score += 8
        motius.append("Import per sobre del patró comparable d'anys no electorals")
    elif not avg_company and amount >= 5000:
        score += 6
        motius.append("Import rellevant sense recurrència comparable")

    if rec["objecte_similar"] >= 2:
        if is_project_showcase:
            score -= 10
            motius.append("Patró recurrent, però vinculat a suports visibles de presentació o ampliació d'equipaments")
        else:
            score -= 28
            motius.append("Patró recurrent en períodes equivalents no electorals")
    elif rec["objecte_similar"] == 1:
        score -= 10
        motius.append("Existeix un antecedent comparable en any no electoral")
    else:
        score += 8
        motius.append("Sense recurrència clara en períodes equivalents no electorals")

    if c["_attenuants"]:
        score -= 12
        motius.append("Objecte amb possibles atenuants d'interès públic ordinari")

    return max(0, min(score, 100)), list(dict.fromkeys(motius))


def build_cases(contractes: list[dict]) -> list[dict]:
    rows = [c for c in (enrich_contract(c) for c in contractes) if c]
    cases = []
    for c in rows:
        window = window_for(c["_date"])
        if not window or c["_sensitive_score"] < 12:
            continue
        rec = recurrence(c, rows, window)
        score, motius = score_case(c, window, rec)
        if score < 40:
            continue
        days_to_vote = (window["data_votacio"] - c["_date"]).days
        is_pre_electoral = c["_date"] < window["data_convocatoria"]
        is_post_electoral = c["_date"] > window["data_votacio"]
        dies_abans_convocatoria = (window["data_convocatoria"] - c["_date"]).days if is_pre_electoral else 0
        dies_despres_votacio = (c["_date"] - window["data_votacio"]).days if is_post_electoral else 0
        fase_temporal = "Període electoral"
        if is_pre_electoral:
            fase_temporal = "Finestra administrativa prèvia"
        elif is_post_electoral:
            fase_temporal = "Finestra administrativa posterior"
        cases.append({
            "id": stable_case_id("EL", "electoralisme", c),
            "tipus_alerta": "electoralisme",
            "risc": score,
            "nivell": risk_label(score),
            "empresa": c.get("adjudicatario", ""),
            "empreses": [c.get("adjudicatario", "")] if c.get("adjudicatario") else [],
            "import_total": round(float(c.get("importe") or 0), 2),
            "data_inici": c.get("fecha"),
            "data_fi": c.get("fecha"),
            "periode_electoral": f"Municipals {window['any']}",
            "data_inici_finestra_previa": window["data_inici_finestra_previa"].isoformat(),
            "data_convocatoria": window["data_convocatoria"].isoformat(),
            "data_votacio": window["data_votacio"].isoformat(),
            "data_fi_finestra_posterior": window["data_fi_finestra_posterior"].isoformat(),
            "fase_temporal": fase_temporal,
            "dies_fins_votacio": days_to_vote,
            "dies_abans_convocatoria": dies_abans_convocatoria,
            "dies_despres_votacio": dies_despres_votacio,
            "termes_detectats": sorted(set(c["_sensitive_terms"] + c["_neutrality_terms"]))[:12],
            "recurrencia": rec,
            "motius": motius[:8],
            "contractes": [{
                "id": c.get("id"),
                "codigo": c.get("codigo"),
                "descripcion": c.get("descripcion"),
                "adjudicatario": c.get("adjudicatario"),
                "importe": c.get("importe"),
                "fecha": c.get("fecha"),
                "tipo": c.get("tipo"),
                "procedimiento": c.get("procedimiento"),
                "cpv": c.get("cpv", ""),
                "estat_font": c.get("estat_font", "actiu_socrata"),
                "preservat_iguadata": bool(c.get("preservat_iguadata")),
                "primera_absencia_detectada": c.get("primera_absencia_detectada", ""),
                "font_preservacio": c.get("font_preservacio", ""),
                "primer_snapshot_iguadata": c.get("primer_snapshot_iguadata", ""),
            }],
        })
    cases = sorted(cases, key=lambda c: (-c["risc"], -c["import_total"], c["data_inici"]))
    return cases


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contractes", type=Path, default=CONTRACTES_FILE)
    parser.add_argument("--output", type=Path, default=OUTPUT_FILE)
    args = parser.parse_args()

    with args.contractes.open("r", encoding="utf-8") as f:
        contractes = json.load(f)

    cases = build_cases(contractes)
    payload = {
        "metodologia": "electoralisme_v1",
        "generat_a": date.today().isoformat(),
        "eleccions_municipals": [
            {
                "any": w["any"],
                "data_inici_finestra_previa": w["data_inici_finestra_previa"].isoformat(),
                "data_convocatoria": w["data_convocatoria"].isoformat(),
                "data_votacio": w["data_votacio"].isoformat(),
                "data_fi_finestra_posterior": w["data_fi_finestra_posterior"].isoformat(),
            }
            for w in election_windows()
        ],
        "total_alertes": len(cases),
        "alertes": cases,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"electoralisme.json: {len(cases)} alertes")


if __name__ == "__main__":
    main()
