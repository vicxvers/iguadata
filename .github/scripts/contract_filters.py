"""Pol?tica ?nica sobre quins contractes poden alimentar m?triques i alertes."""


def is_analysis_contract(row: dict) -> bool:
    return (
        isinstance(row, dict)
        and not row.get("preservat_iguadata")
        and row.get("estat_font") != "preservat_desaparegut_socrata"
        and row.get("exclos_analisis") is not True
    )
