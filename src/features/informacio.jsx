function SobreView() {
    return (
        <div className="container prose-page narrative-info-page">
            <h1 className="page-title">Sobre el projecte</h1>
            <div className="prose-wrapper narrative-story">
                <p className="prose-intro">
                    {BRAND_NAME} és la plataforma independent de periodisme de dades per a l'anàlisi de la contractació pública i les subvencions de {AUTHORITY_NAME} i dels seus organismes municipals.<br /><br />El projecte combina dades obertes de contractació i subvencions, informació mercantil i algoritmes propis per fer més accessible, comprensible i fiscalitzable la despesa pública municipal.
                </p>
                <h2 className="prose-heading">Autoria</h2>
                <p className="prose-paragraph">
                    Iguadata és un projecte de l'igualadí <a href="https://x.com/viictxxr" target="_blank" rel="noopener noreferrer" className="prose-link">Víctor Recio Rodríguez</a>, desenvolupat com a Treball Final del Màster en Periodisme i Comunicació Digital: Dades i Noves Narratives de la Universitat Oberta de Catalunya (UOC), sota la tutoria de Carlos López Olano.
                </p>
                <h2 className="prose-heading">Objectius</h2>
                <p className="prose-paragraph">
                    Iguadata neix amb tres objectius principals: facilitar l'accés de la ciutadania a la contractació i les subvencions públiques municipals, detectar patrons que puguin merèixer revisió periodística o institucional, i construir una metodologia replicable per altres municipis.
                </p>
                <p className="prose-paragraph">
                    La plataforma no substitueix la feina dels òrgans fiscalitzadors, jurídics o administratius. El seu paper és ordenar dades disperses, mostrar relacions i generar indicadors que ajudin a fer millors preguntes.
                </p>
                <h2 className="prose-heading">Què analitza</h2>
                <p className="prose-paragraph">
                    Iguadata permet consultar contractes, empreses adjudicatàries, persones vinculades a aquestes empreses, subvencions, entitats beneficiàries i diferents indicadors d'anàlisi.
                </p>
                <p className="prose-paragraph">
                    Els principals blocs d'anàlisi són el possible fraccionament de contractes menors, la concentració d'adjudicacions en determinades empreses o sectors, els patrons d'electoralisme o comunicació institucional en períodes sensibles i l'acumulació o recurrència de subvencions directes en una mateixa entitat.
                </p>
                <h2 className="prose-heading">Font de dades</h2>
                <p className="prose-paragraph">
                    Les dades de contractació provenen del Registre Públic de Contractes de la Generalitat de Catalunya, consultat mitjançant l'API Socrata Open Data (SODA).
                </p>
                <p className="prose-paragraph">
                    Les dades de subvencions provenen del Registre d'Ajuts i Subvencions de Catalunya (RAISC). Iguadata selecciona les concessions emeses per {AUTHORITY_NAME} i publica únicament els registres amb beneficiaris identificats com a entitats publicables.
                </p>
                <p className="prose-paragraph">
                    Les dades mercantils provenen del Butlletí Oficial del Registre Mercantil (BORME), registre oficial públic. Mitjançant un processament massiu, tècniques de mineria de dades i l'ús de programari de codi obert desenvolupat per <a href="https://github.com/BquantFinance" target="_blank" rel="noopener noreferrer" className="prose-link">Gerard Sánchez Vidal</a>, s'identifiquen els càrrecs actius de les empreses adjudicatàries.
                </p>
                <p className="prose-paragraph">
                    Una actualització automàtica setmanal genera una fotografia coherent dels contractes, les subvencions, les empreses, les entitats, les persones i els resultats analítics. També es generen fitxers JSON propis que permeten alimentar la interfície, accelerar la consulta i mantenir còpies de suport en cas de caiguda temporal de les fonts externes.
                </p>
                <h2 className="prose-heading">Metodologia</h2>
                <p className="prose-paragraph">
                    El projecte utilitza scripts de Python per descarregar, netejar, normalitzar i encreuar dades. Part del procés d'actualització s'executa automàticament mitjançant GitHub Actions, amb controls de validació, còpies de seguretat i comprovacions d'integritat.
                </p>
                <p className="prose-paragraph">
                    Els algoritmes d'Iguadata no emeten veredictes. Detecten patrons, acumulacions, recurrències, proximitats temporals, vincles mercantils o combinacions de factors que poden tenir interès públic i periodístic.
                </p>
                <h2 className="prose-heading">Limitacions</h2>
                <p className="prose-paragraph">
                    Les dades poden contenir errors d'origen, omissions, duplicats, canvis posteriors o incidències derivades de la normalització i classificació automatitzades. L'aparició d'una empresa, entitat, persona, contracte o subvenció en una alerta no implica cap irregularitat legal confirmada.
                </p>
                <p className="prose-paragraph">
                    Qualsevol conclusió periodística, administrativa o jurídica requereix contrastar les dades amb expedients originals, informes tècnics, resolucions, convocatòries, bases reguladores, plecs i altres fonts documentals.
                </p>
                <h2 className="prose-heading">Codi obert</h2>
                <p className="prose-paragraph">
                    El codi font del projecte és públic i està disponible a <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="prose-link">GitHub</a> sota llicència GNU GPL v3.0.
                </p>
                <h2 className="prose-heading">Contacte</h2>
                <p className="prose-paragraph">
                    Per a suggeriments, correccions factuals, col·laboracions o consultes sobre el projecte, es pot contactar a partir de <a href={`mailto:${CONTACT_EMAIL}`} className="prose-link">{CONTACT_EMAIL}</a>.
                </p>
            </div>
        </div>
    );
}

function LegalView() {
    return (
        <div className="container prose-page narrative-info-page">
            <h1 className="page-title">Avís Legal</h1>
            <div className="prose-wrapper narrative-story">
                <h2 className="prose-heading">1. Identificació i titularitat</h2>
                <p className="prose-paragraph">
                    {BRAND_NAME} és un projecte independent de transparència, anàlisi de dades públiques i fiscalització cívica de la contractació i les subvencions públiques vinculades a {AUTHORITY_NAME} i als seus organismes municipals relacionats.
                </p>
                <p className="prose-paragraph">
                    Iguadata no és una administració pública ni actua en nom de cap institució. La plataforma té finalitats informatives, periodístiques, educatives, de recerca i de divulgació.
                </p>
                <p className="prose-paragraph">
                    Responsable del projecte i del tractament: Víctor Recio Rodríguez. Contacte: <a href={`mailto:${CONTACT_EMAIL}`} className="prose-link">{CONTACT_EMAIL}</a>.
                </p>
                <h2 className="prose-heading">2. Origen de les dades</h2>
                <p className="prose-paragraph">
                    Les dades de contractació provenen del Registre Públic de Contractes de la Generalitat de Catalunya, consultat mitjançant l'API Socrata Open Data (SODA), i d'altres fonts públiques oficials de contractació.
                </p>
                <p className="prose-paragraph">
                    Les dades de subvencions provenen del Registre d'Ajuts i Subvencions de Catalunya (RAISC). Iguadata selecciona les concessions emeses per {AUTHORITY_NAME} i processa la informació sobre els imports, les finalitats, els procediments de concessió i els beneficiaris que poden ser objecte de publicació.
                </p>
                <p className="prose-paragraph">
                    Les dades mercantils provenen del Butlletí Oficial del Registre Mercantil (BORME), registre oficial de caràcter públic. Iguadata processa aquestes dades mitjançant eines automatitzades de descàrrega, extracció, normalització i encreuament de dades.
                </p>
                <p className="prose-paragraph">
                    La informació publicada es basa en fonts públiques i oficials. Tot i això, poden existir errors d'origen, omissions, canvis posteriors, diferències de normalització de noms o incidències derivades del processament automatitzat.
                </p>
                <h2 className="prose-heading">3. Actualització i traçabilitat</h2>
                <p className="prose-paragraph">
                    La plataforma publica fotografies setmanals coherents de contractes i subvencions generades a partir de fonts públiques. Part del procés d'actualització s'executa de manera automatitzada mitjançant GitHub Actions, amb controls tècnics de validació, preservació de registres, còpies de seguretat i comprovacions d'integritat dels fitxers generats.
                </p>
                <p className="prose-paragraph">
                    Aquest procés no altera el sentit de les dades originals, sinó que les estructura, normalitza i encreua per facilitar-ne la consulta pública i l'anàlisi.
                </p>
                <h2 className="prose-heading">4. Finalitat del tractament</h2>
                <p className="prose-paragraph">
                    La finalitat d'Iguadata és facilitar l'accés, la comprensió i l'anàlisi de dades públiques sobre contractació i subvencions municipals, concentració empresarial, vincles mercantils, possibles patrons de fraccionament, indicadors de risc electoral o institucional i acumulació o recurrència de subvencions directes.
                </p>
                <p className="prose-paragraph">
                    Les visualitzacions, cercadors i alertes tenen una funció orientativa i d'interès públic. No constitueixen resolucions administratives, acusacions, proves concloents ni imputacions d'irregularitat.
                </p>
                <h2 className="prose-heading">5. Limitació de responsabilitat</h2>
                <p className="prose-paragraph">
                    Els indicadors generats per Iguadata identifiquen patrons estadístics o relacions documentals que poden ser d'interès públic, però requereixen sempre interpretació contextual i, si escau, verificació addicional amb expedients, informes, plecs, resolucions administratives o altres fonts originals.
                </p>
                <p className="prose-paragraph">
                    L'aparició d'una empresa, entitat, persona, contracte o subvenció dins d'un indicador no implica per si mateixa cap infracció legal, administrativa, ètica o penal.
                </p>
                <p className="prose-paragraph">
                    En particular, les alertes de dependència identifiquen patrons d'acumulació o recurrència de subvencions directes. Aquests patrons poden tenir interès públic o periodístic, però no acrediten un ús indegut dels recursos públics ni una actuació irregular de l'entitat beneficiària o de l'administració concedent.
                </p>
                <h2 className="prose-heading">6. Protecció de dades personals</h2>
                <p className="prose-paragraph">
                    Iguadata no utilitza cookies de seguiment ni eines d'analítica orientades a perfilar usuaris. La plataforma pot utilitzar analítica web agregada i respectuosa amb la privacitat per conèixer l'ús general del projecte, sense identificar individualment els visitants ni crear perfils personals.
                </p>
                <p className="prose-paragraph">
                    Les persones que apareixen en el cercador de persones es mostren en la seva condició de representants mercantils, administradors, apoderats, auditors, socis únics o altres càrrecs societaris vinculats a empreses adjudicatàries, segons dades publicades al BORME i en fonts oficials de contractació pública.
                </p>
                <p className="prose-paragraph">
                    L'import associat a una persona correspon al volum total adjudicat a les empreses amb les quals consta vinculada en els registres analitzats. Aquesta xifra no representa ingressos personals, patrimoni individual, remuneració ni benefici directe.
                </p>
                <p className="prose-paragraph">
                    En l'àmbit de les subvencions, la interfície pública mostra únicament els registres corresponents a beneficiaris identificats com a entitats publicables. Les concessions associades a persones físiques o a beneficiaris no publicables es conserven només quan són necessàries per al tractament intern i l'anàlisi agregada, però no es mostren ni permeten identificar-ne els beneficiaris a la plataforma pública.
                </p>
                <p className="prose-paragraph">
                    El tractament es fonamenta en l'article 6.1.e) del Reglament (UE) 2016/679 (RGPD), relatiu al compliment d'una missió realitzada en interès públic, i en la normativa de transparència i accés a la informació pública, inclosa la Llei 19/2013 i la Llei 19/2014 de transparència de Catalunya.
                </p>
                <p className="prose-paragraph">
                    Les dades publicades es limiten a la informació estrictament necessària per a la finalitat de transparència i fiscalització pública, d'acord amb el principi de minimització de dades de l'article 5.1.c del RGPD. No es publiquen dades de la vida privada, domicilis personals, documents identificatius, dades de contacte privades ni informació aliena a les dimensions mercantil, contractual o subvencional analitzades.
                </p>
                <h2 className="prose-heading">7. Assistent d’intel·ligència artificial</h2>
                <p className="prose-paragraph">
                    Quan una persona utilitza l’assistent d’Iguadata, la pregunta introduïda i una selecció de dades públiques relacionades amb la consulta es transmeten a l’API d’OpenAI exclusivament per generar la resposta. Iguadata no demana ni necessita que s’hi introdueixin dades personals, confidencials o sensibles.
                </p>
                <p className="prose-paragraph">
                    Les peticions es configuren sense emmagatzematge de la resposta per part de l’aplicació. OpenAI pot conservar temporalment registres necessaris per prevenir abusos i garantir la seguretat del servei, d’acord amb les seves polítiques aplicables a l’API. Les respostes són generades automàticament, poden contenir errors i s’han de contrastar amb les fonts públiques originals.
                </p>
                <p className="prose-paragraph">
                    Per protegir l’assistent contra usos automatitzats i abusius, Iguadata utilitza Cloudflare Turnstile. Aquest mecanisme verifica el navegador abans de cada consulta i no rep el contingut de la pregunta.
                </p>
                <h2 className="prose-heading">8. Exercici de drets i correccions</h2>
                <p className="prose-paragraph">
                    Les persones interessades poden exercir els drets d'accés, rectificació, limitació o oposició al tractament a <a href={`mailto:${CONTACT_EMAIL}`} className="prose-link">{CONTACT_EMAIL}</a>.
                </p>
                <p className="prose-paragraph">
                    També es poden comunicar errors factuals, homonímies, atribucions incorrectes, canvis de denominació, classificacions errònies, dades desactualitzades o incidències derivades del processament automatitzat.
                </p>
                <p className="prose-paragraph">
                    Quan es detecti un error factual, Iguadata podrà corregir, contextualitzar, limitar o retirar la informació afectada. El dret de supressió pot quedar limitat quan la informació procedeixi de registres oficials públics o documentació administrativa de contractació pública, d'acord amb l'article 17.3.b) del RGPD.
                </p>
                <h2 className="prose-heading">9. Propietat intel·lectual i codi obert</h2>
                <p className="prose-paragraph">
                    El disseny, la metodologia, el codi font i les transformacions de dades desenvolupades específicament són de propietat d'Iguadata.
                </p>
                <p className="prose-paragraph">
                    El codi font es publica sota llicència GNU GPL v3.0 a GitHub. Les dades originals pertanyen a les seves fonts públiques respectives i es reutilitzen amb finalitats de transparència, recerca i interès públic.
                </p>
                <h2 className="prose-heading">10. Fonts normatives principals</h2>
                <p className="prose-paragraph">
                    El present avís legal es basa, entre altres, en el Reglament (UE) 2016/679 (RGPD), la Llei 19/2013, de transparència, accés a la informació pública i bon govern, la Llei 19/2014, de transparència, accés a la informació pública i bon govern de Catalunya, la Llei 38/2003, general de subvencions, i el Decret 271/2019, pel qual s'aprova el Reglament del Registre de subvencions i ajuts de Catalunya.
                </p>
            </div>
        </div>
    );
}
