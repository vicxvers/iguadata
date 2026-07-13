"""
Genera json/persones.json a partir de json/carrecs.json.

Inverteix l'estructura empresa->admins a persona->empreses, afegint
l'import adjudicat de cada empresa des de json/empreses.json.

Us: python .github/scripts/generate_persones.py
"""

import json
from collections import defaultdict
from pathlib import Path

from atomic_io import write_json_atomic

ROOT = Path(__file__).resolve().parents[2]

INPUT_ADMINS   = ROOT / 'json' / 'carrecs.json'
INPUT_EMPRESES = ROOT / 'json' / 'empreses.json'
OUTPUT_PERSONES = ROOT / 'json' / 'persones.json'


def main():
    with open(INPUT_ADMINS, encoding='utf-8') as f:
        admins = json.load(f)

    with open(INPUT_EMPRESES, encoding='utf-8') as f:
        empreses_list = json.load(f)

    # Index d'imports per nom d'empresa (clau = nom original API)
    import_per_empresa = {e['nom']: e.get('total_importe', 0.0) for e in empreses_list if e.get('nom')}

    # persona -> { total_adjudicat, empreses_map: {empresa_nom -> {import, carrecs}} }
    persones: dict = defaultdict(lambda: {'total_adjudicat': 0.0, 'empreses_map': {}})

    for empresa_nom, admins_list in admins.items():
        import_empresa = import_per_empresa.get(empresa_nom, 0.0)
        for admin in admins_list:
            persona = admin.get('nombre', '').strip()
            cargo   = admin.get('cargo', '').strip()
            if not persona:
                continue
            # El cercador de persones nomes mostra persones fisiques.
            # Les empreses administradores queden al JSON d'administradors per a la fitxa d'empresa.
            if admin.get('tipo_entidad') == 'empresa':
                continue

            p = persones[persona]
            if empresa_nom not in p['empreses_map']:
                # Primera vegada que veiem aquesta empresa per a aquesta persona
                p['empreses_map'][empresa_nom] = {
                    'empresa': empresa_nom,
                    'import_empresa': import_empresa,
                    'carrecs': [cargo] if cargo else [],
                }
                p['total_adjudicat'] += import_empresa
            else:
                # Ja tenim l'empresa; afegim el carrec si es nou
                if cargo and cargo not in p['empreses_map'][empresa_nom]['carrecs']:
                    p['empreses_map'][empresa_nom]['carrecs'].append(cargo)

    # Construeix llista final ordenada per total_adjudicat desc
    result = []
    for nom, data in persones.items():
        relacions = sorted(
            data['empreses_map'].values(),
            key=lambda r: r['import_empresa'],
            reverse=True,
        )
        result.append({
            'nom': nom,
            'total_adjudicat': round(data['total_adjudicat'], 2),
            'relacions': relacions,
        })

    result.sort(key=lambda p: p['total_adjudicat'], reverse=True)

    write_json_atomic(OUTPUT_PERSONES, result)

    total_relacions = sum(len(p['relacions']) for p in result)
    print(f"  [OK] {OUTPUT_PERSONES.name} -> {len(result)} persones, {total_relacions} relacions empresa-persona")


if __name__ == '__main__':
    main()
