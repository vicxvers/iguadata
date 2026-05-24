import re
import unicodedata


def normalize_empresa(name):
    """Normalitza nom d'empresa per matching entre BORME i contractes."""
    if not name or not isinstance(name, str):
        return ""

    n = name.upper().strip()

    n = n.replace("Ñ", "##ENIE##")
    n = unicodedata.normalize("NFD", n)
    n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    n = n.replace("##ENIE##", "Ñ")

    n = re.sub(r"\s*\([^)]*\)", "", n)

    replacements = [
        (r"\bS\s*\.\s*R\s*\.\s*L\s*\.?\b", "SRL"),
        (r"\bS\s*\.\s*L\s*\.\s*U\s*\.?\b", "SLU"),
        (r"\bS\s*\.\s*L\s*\.\s*P\s*\.?\b", "SLP"),
        (r"\bS\s*\.\s*L\s*\.\s*L\s*\.?\b", "SLL"),
        (r"\bS\s*\.\s*L\s*\.?\b", "SL"),
        (r"\bS\s*\.\s*A\s*\.\s*U\s*\.?\b", "SAU"),
        (r"\bS\s*\.\s*A\s*\.\s*E\s*\.?\b", "SAE"),
        (r"\bS\s*\.\s*A\s*\.?\b", "SA"),
        (r"\bS\s*\.\s*C\s*\.?\b", "SC"),
        (r"\bA\s*\.\s*I\s*\.\s*E\s*\.?\b", "AIE"),
        (r"\bS\s*\.\s*M\s*\.\s*E\s*\.?\b", "SME"),
        (r"\bS\s+R\s+L\b", "SRL"),
        (r"\bS\s+M\s+E\b", "SME"),
        (r"\bS\s+L\s+U\b", "SLU"),
        (r"\bS\s+L\s+P\b", "SLP"),
        (r"\bS\s+L\s+L\b", "SLL"),
        (r"\bS\s+L\b$", "SL"),
        (r"\bS\s+A\s+U\b", "SAU"),
        (r"\bS\s+A\s+E\b", "SAE"),
        (r"\bS\s+A\b$", "SA"),
    ]
    for pattern, repl in replacements:
        n = re.sub(pattern, repl, n)

    n = re.sub(r"[,.\-]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()

    suffixes = [
        " SOCIEDAD ANONIMA DEPORTIVA", " SOCIEDAD ANONIMA",
        " SOCIEDAD LIMITADA PROFESIONAL", " SOCIEDAD LIMITADA LABORAL",
        " SOCIEDAD LIMITADA NUEVA EMPRESA", " SOCIEDAD LIMITADA",
        " SOCIEDAD COOPERATIVA ANDALUZA", " SOCIEDAD COOPERATIVA",
        " SOCIEDAD CIVIL PROFESIONAL", " SOCIEDAD CIVIL",
        " SOCIEDAD UNIPERSONAL", " AGRUPACION DE INTERES ECONOMICO",
        " SAU", " SLU", " SAD", " SLL", " SLP", " SLNE",
        " SA SME", " SAE", " SME", " SA", " SL", " SC",
        " SCA", " SCCL", " SCOOP", " SE", " SRL", " AIE",
    ]

    changed = True
    while changed:
        changed = False
        for suffix in suffixes:
            if n.endswith(suffix):
                n = n[:-len(suffix)].strip()
                changed = True
                break

    return re.sub(r"[.,;]+$", "", n).strip()
