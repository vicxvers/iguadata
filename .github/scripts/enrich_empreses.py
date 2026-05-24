import json
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
filepath = os.path.join(BASE_DIR, 'json', 'empreses.json')

# Mapeig complet dels 44 sectors CPV (classificar_empreses.py) → 12 sectors de la UI
sector_mapping = {
    # ── Productes ──────────────────────────────────────────────────────────
    "Productes agrícoles i ramaders":       "Agricultura i Alimentació",            # CPV 03
    "Productes petrolífers i energia":      "Indústria, Maquinària i Energia",      # CPV 09
    "Productes de mineria":                 "Indústria, Maquinària i Energia",      # CPV 14
    "Aliments i begudes":                   "Agricultura i Alimentació",            # CPV 15
    "Maquinària agrícola":                  "Agricultura i Alimentació",            # CPV 16
    "Roba i calçat":                        "Béns de Consum i Comerç",              # CPV 18
    "Cuir i tèxtils":                       "Béns de Consum i Comerç",              # CPV 19
    "Impresos i productes relacionats":     "Béns de Consum i Comerç",              # CPV 22
    "Productes químics":                    "Indústria, Maquinària i Energia",      # CPV 24
    "Maquinària d'oficina i informàtica":   "Tecnologia i Telecomunicacions",       # CPV 30
    "Maquinària elèctrica":                 "Indústria, Maquinària i Energia",      # CPV 31
    "Equips de telecomunicacions":          "Tecnologia i Telecomunicacions",       # CPV 32
    "Equipament mèdic i farmacèutic":       "Salut i Serveis Socials",              # CPV 33
    "Equips de transport":                  "Transport i Logística",                # CPV 34
    "Equips de seguretat i defensa":        "Seguretat i Defensa",                  # CPV 35
    "Instruments musicals i esportius":     "Cultura, Oci i Esport",                # CPV 37
    "Equips de laboratori i precisió":      "Indústria, Maquinària i Energia",      # CPV 38
    "Mobiliari i equipament":               "Béns de Consum i Comerç",              # CPV 39
    "Maquinària industrial":                "Indústria, Maquinària i Energia",      # CPV 42
    "Maquinària de mineria":                "Indústria, Maquinària i Energia",      # CPV 43
    "Materials de construcció":             "Construcció i Infraestructures",       # CPV 44
    "Obres de construcció":                 "Construcció i Infraestructures",       # CPV 45
    "Paquets de programari":                "Tecnologia i Telecomunicacions",       # CPV 48
    # ── Serveis ────────────────────────────────────────────────────────────
    "Serveis de reparació i manteniment":   "Medi Ambient, Neteja i Manteniment",   # CPV 50
    "Serveis d'instal·lació":               "Construcció i Infraestructures",       # CPV 51
    "Serveis d'hostaleria i restauració":   "Agricultura i Alimentació",            # CPV 55
    "Serveis de transport":                 "Transport i Logística",                # CPV 60
    "Serveis auxiliars de transport":       "Transport i Logística",                # CPV 63
    "Serveis postals i telecomunicacions":  "Tecnologia i Telecomunicacions",       # CPV 64
    "Serveis públics (aigua, energia)":     "Indústria, Maquinària i Energia",      # CPV 65
    "Serveis financers i d'assegurances":   "Serveis Professionals i Corporatius",  # CPV 66
    "Serveis immobiliaris":                 "Serveis Professionals i Corporatius",  # CPV 70
    "Serveis d'arquitectura i enginyeria":  "Construcció i Infraestructures",       # CPV 71
    "Serveis informàtics (TI)":             "Tecnologia i Telecomunicacions",       # CPV 72
    "Serveis d'investigació (R+D)":         "Educació i Recerca",                   # CPV 73
    "Serveis d'administració pública":      "Serveis Professionals i Corporatius",  # CPV 75
    "Serveis del sector petroler":          "Indústria, Maquinària i Energia",      # CPV 76
    "Serveis agrícoles i forestals":        "Agricultura i Alimentació",            # CPV 77
    "Serveis empresarials i de consultoria":"Serveis Professionals i Corporatius",  # CPV 79
    "Serveis d'ensenyament i formació":     "Educació i Recerca",                   # CPV 80
    "Serveis sanitaris i socials":          "Salut i Serveis Socials",              # CPV 85
    "Aigües residuals, residus i neteja":   "Medi Ambient, Neteja i Manteniment",   # CPV 90
    "Serveis recreatius i culturals":       "Cultura, Oci i Esport",                # CPV 92
    "Altres serveis comunitaris":           "Altres Serveis i Subministraments",    # CPV 98
}

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

updated = 0
fallback = 0
for emp in data:
    cat = emp.get('categoria')
    if cat:
        sector = sector_mapping.get(cat)
        if sector:
            emp['sector'] = sector
            updated += 1
        else:
            emp['sector'] = 'Altres Serveis i Subministraments'
            fallback += 1

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"OK Fet! {updated} empreses actualitzades, {fallback} sense mapping (fallback).")
