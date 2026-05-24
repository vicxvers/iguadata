import re
import unicodedata


_COMPANY_RE = re.compile(
    r"\b("
    r"S\.?\s*L\.?|S\.?\s*A\.?|S\.?\s*L\.?\s*U\.?|S\.?\s*A\.?\s*U\.?|"
    r"S\.?\s*L\.?\s*P\.?|S\.?\s*L\.?\s*L\.?|S\.?\s*C\.?|S\.?\s*R\.?\s*L\.?|"
    r"A\.?\s*I\.?\s*E\.?|S\.?\s*M\.?\s*E\.?|SL|SA|SLU|SAU|SLP|SLL|SRL|AIE|"
    r"SOCIEDAD|LIMITADA|ANONIMA|ANONIMA|COOPERATIVA|UNIPERSONAL|"
    r"AGRUPACION DE INTERES ECONOMICO|FUNDACION|ASSOCIACIO|ASOCIACION"
    r")\b",
    re.IGNORECASE,
)


def _fold(value: str) -> str:
    value = value.upper().replace("Ñ", "##ENIE##")
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return value.replace("##ENIE##", "Ñ")


def is_company_name(value: str) -> bool:
    """Detecta administradors que son persones juridiques."""
    if not value or not isinstance(value, str):
        return False
    return bool(_COMPANY_RE.search(_fold(value)))
