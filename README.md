# Iguadata

Iguadata és una plataforma oberta per explorar la contractació pública de l'Ajuntament d'Igualada.

El projecte combina dades de contractes, empreses adjudicatàries, persones vinculades a càrrecs mercantils i indicadors d'anàlisi pública per facilitar una lectura més clara de l'ecosistema de contractació municipal.

Web oficial: [iguadata.cat](https://iguadata.cat)

## Què inclou

- Cercador de contractes públics.
- Cercador d'empreses adjudicatàries.
- Cercador de persones vinculades a càrrecs i apoderaments mercantils.
- Fitxes detallades d'empreses, contractes i casos d'anàlisi.
- Indicadors de fraccionament, concentració i electoralisme institucional.
- Actualització automàtica setmanal de dades.

## Fonts de dades

Iguadata treballa principalment amb:

- Dades obertes de contractació municipal publicades a Socrata.
- Informació mercantil pública extreta del BORME.
- Fitxers JSON generats automàticament per al frontend.

Els fitxers pesants del BORME no viuen dins del repositori Git. Es conserven com a assets del Release `data`.

## Limitacions

Les alertes, imports, vinculacions mercantils i patrons detectats no impliquen irregularitat, benefici personal ni responsabilitat legal.

La plataforma és una eina de transparència, exploració i context periodístic basada en fonts públiques. Qualsevol dada pot contenir errors d'origen o derivats del processament automatitzat.

## Actualització

El workflow `Update BORME data` actualitza setmanalment:

- `json/contractes.json`
- `json/contractes_arxiu.json`
- `json/empreses.json`
- `json/carrecs.json`
- `json/persones.json`
- `json/fraccionament.json`
- `json/concentracio.json`
- `json/electoralisme.json`

També manté snapshots i parquets acumulats als Releases `snapshots` i `data`.

## Desenvolupament

El repositori de producció és `vicxvers/iguadata`.

El desenvolupament i les proves es fan a `vicxvers/iguadata-dev`, publicat a:

[iguadata-dev.netlify.app](https://iguadata-dev.netlify.app)

Per servir la web en local:

```bash
python -m http.server 8080
```

## Contacte

Per consultes, correccions o exercici de drets relacionats amb dades personals:

[hola@iguadata.cat](mailto:hola@iguadata.cat)
