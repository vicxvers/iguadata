# Sobre el projecte

Iguadata és la plataforma independent de periodisme de dades per a l'anàlisi de la contractació pública i les subvencions de l'Ajuntament d'Igualada i dels seus organismes municipals.

El projecte combina dades obertes de contractació i subvencions, informació mercantil i algoritmes propis per fer més accessible, comprensible i fiscalitzable la despesa pública municipal.

## Autoria

Iguadata és un projecte de l'igualadí [Víctor Recio Rodríguez](https://x.com/viictxxr), desenvolupat com a Treball Final del Màster en Periodisme i Comunicació Digital: Dades i Noves Narratives de la Universitat Oberta de Catalunya (UOC), sota la tutoria de Carlos López Olano.

## Objectius

Iguadata neix amb tres objectius principals: facilitar l'accés de la ciutadania a la contractació i les subvencions públiques municipals, detectar patrons que puguin merèixer revisió periodística o institucional, i construir una metodologia replicable per altres municipis.

La plataforma no substitueix la feina dels òrgans fiscalitzadors, jurídics o administratius. El seu paper és ordenar dades disperses, mostrar relacions i generar indicadors que ajudin a fer millors preguntes.

## Què analitza

Iguadata permet consultar contractes, empreses adjudicatàries, persones vinculades a aquestes empreses, subvencions, entitats beneficiàries i diferents indicadors d'anàlisi.

Els principals blocs d'anàlisi són el possible fraccionament de contractes menors, la concentració d'adjudicacions en determinades empreses o sectors, els patrons d'electoralisme o comunicació institucional en períodes sensibles i l'acumulació o recurrència de subvencions directes en una mateixa entitat.

## Font de dades

Les dades de contractació provenen del Registre Públic de Contractes de la Generalitat de Catalunya, consultat mitjançant l'API Socrata Open Data (SODA).

Les dades de subvencions provenen del Registre d'Ajuts i Subvencions de Catalunya (RAISC). Iguadata selecciona les concessions emeses per l'Ajuntament d'Igualada i publica únicament els registres amb beneficiaris identificats com a entitats publicables.

Les dades mercantils provenen del Butlletí Oficial del Registre Mercantil (BORME), registre oficial públic. Mitjançant un processament massiu, tècniques de mineria de dades i l'ús de programari de codi obert desenvolupat per [Gerard Sánchez Vidal](https://github.com/BquantFinance), s'identifiquen els càrrecs actius de les empreses adjudicatàries.

Una actualització automàtica setmanal genera una fotografia coherent dels contractes, les subvencions, les empreses, les entitats, les persones i els resultats analítics. També es generen fitxers JSON propis que permeten alimentar la interfície, accelerar la consulta i mantenir còpies de suport en cas de caiguda temporal de les fonts externes.

## Metodologia

El projecte utilitza scripts de Python per descarregar, netejar, normalitzar i encreuar dades. Part del procés d'actualització s'executa automàticament mitjançant GitHub Actions, amb controls de validació, còpies de seguretat i comprovacions d'integritat.

Els algoritmes d'Iguadata no emeten veredictes. Detecten patrons, acumulacions, recurrències, proximitats temporals, vincles mercantils o combinacions de factors que poden tenir interès públic i periodístic.

## Limitacions

Les dades poden contenir errors d'origen, omissions, duplicats, canvis posteriors o incidències derivades de la normalització i classificació automatitzades. L'aparició d'una empresa, entitat, persona, contracte o subvenció en una alerta no implica cap irregularitat legal confirmada.

Qualsevol conclusió periodística, administrativa o jurídica requereix contrastar les dades amb expedients originals, informes tècnics, resolucions, convocatòries, bases reguladores, plecs i altres fonts documentals.

## Codi obert

El codi font del projecte és públic i està disponible a [GitHub](https://github.com/vicxvers/iguadata) sota llicència GNU GPL v3.0.

## Contacte

Per a suggeriments, correccions factuals, col·laboracions o consultes sobre el projecte, es pot contactar a partir de [hola@iguadata.cat](mailto:hola@iguadata.cat).
