const ASSISTENT_SUGGERIMENTS = [
    'Quins són els últims contractes?',
    'Quines empreses tenen més contractes?',
    'Quines entitats reben més subvencions?',
    'Quines alertes tenen més risc?',
    'Què ha investigat Iguadata?',
];

const ASSISTENT_TURNSTILE_SITEKEY = '0x4AAAAAAEXuvMtyPCfi_B_1';
const ASSISTENT_TURNSTILE_TEST_SITEKEY = '1x00000000000000000000AA';
let assistentTurnstilePromise = null;

function loadAssistentTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (assistentTurnstilePromise) return assistentTurnstilePromise;
    assistentTurnstilePromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile no disponible'));
        script.onerror = () => reject(new Error('No s’ha pogut carregar Turnstile'));
        document.head.appendChild(script);
    }).catch(error => {
        assistentTurnstilePromise = null;
        throw error;
    });
    return assistentTurnstilePromise;
}

const ASSISTENT_STOP_WORDS = new Set([
    'a', 'al', 'als', 'amb', 'de', 'del', 'dels', 'el', 'els', 'en', 'i', 'la', 'les',
    'mostra', 'mostrar', 'busca', 'buscar', 'cerca', 'cercar', 'sobre', 'que', 'quins',
    'quines', 'quin', 'quina', 'hi', 'ha', 'un', 'una', 'uns', 'unes', 'per', 'any',
    'contracte', 'contractes', 'empresa', 'empreses', 'cas', 'casos', 'alerta', 'alertes',
    'investigacio', 'investigacions', 'reportatge', 'reportatges', 'publicat', 'publicats',
    'publicada', 'publicades',
    'quant', 'quants', 'quanta', 'quantes', 'rebut', 'rebre', 'adjudicat', 'adjudicats',
    'adjudicada', 'adjudicades', 'adjudicacio', 'adjudicacions', 'import', 'total', 'suma',
    'diners', 'troba', 'dona', 'informacio', 'dades', 'relacionat', 'relacionats',
    'te', 'tenen', 'fet', 'fets', 'feta', 'fetes',
    'fraccionament', 'concentracio', 'electoralisme', 'dependencia', 'risc',
    'hola', 'bones', 'bon', 'dia', 'tarda', 'nit',
    'va', 'passar', 'diu', 'dir', 'aixo', 'aquest', 'aquesta', 'aquell', 'aquella',
    'mateix', 'mateixa', 'anterior', 'explica', 'explicar', 'analitza', 'analitzar',
    'saber', 'saps', 'sap', 'digues', 'parla',
    'qui', 'es', 'son', 'mes', 'alt', 'alts', 'destaca', 'destaquen', 'revela', 'revelen',
    'investigat', 'iguadata', 'vinculada', 'vinculades', 'persones', 'persona', 'estan',
    'subvencio', 'subvencions', 'imports',
]);

function esSalutacioAssistent(query) {
    const normalized = normalitzaTextAssistent(query);
    return /^(hola|bones|bon dia|bona tarda|bona nit|ei|hey|hello)( com estas?)?[!.?]*$/.test(normalized);
}

function normalitzaTextAssistent(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function paraulesConsultaAssistent(query) {
    return normalitzaTextAssistent(query)
        .split(' ')
        .filter(word => word.length > 1 && !ASSISTENT_STOP_WORDS.has(word) && !/^20\d{2}$/.test(word));
}

function extreuIdsAlertaAssistent(value) {
    return String(value || '').toUpperCase().match(/\b(?:FR|CO|EL|DE)-[A-F0-9]+\b/g) || [];
}

function puntuacioAssistent(query, values) {
    const normalizedQuery = normalitzaTextAssistent(query);
    const words = paraulesConsultaAssistent(query);
    const haystack = normalitzaTextAssistent(values.filter(Boolean).join(' '));
    if (!haystack || (!normalizedQuery && !words.length)) return 0;
    let score = normalizedQuery.length > 2 && haystack.includes(normalizedQuery) ? 20 : 0;
    for (const word of words) {
        if (haystack.includes(word)) score += word.length > 5 ? 4 : 2;
    }
    return score;
}

function coincideixConsultaAssistent(query, values, allowEmpty = false) {
    const words = paraulesConsultaAssistent(query);
    if (!words.length) return allowEmpty;
    const haystack = normalitzaTextAssistent(values.filter(Boolean).join(' '));
    return words.every(word => haystack.includes(word));
}

function dadesCercaInvestigacio(item) {
    return [item.title, item.subtitle, ...(item.content || []).map(block => block.text)];
}

function resultatInvestigacio(item) {
    return {
        type: 'Investigació',
        title: item.title,
        meta: item.subtitle || item.date,
        href: buildRouteUrl(`/investigacio/${item.slug}`),
    };
}

function evidenciaInvestigacio(item) {
    return {
        tipus: 'investigacio',
        titol: item.title,
        subtitol: item.subtitle,
        data: item.date,
        import: item.importe,
        extracte: (item.content || [])
            .map(block => block.text)
            .filter(Boolean)
            .join(' ')
            .slice(0, 2400),
    };
}

function dadesCercaPersona(persona) {
    return [
        persona.nom,
        ...(persona.relacions || []).flatMap(relacio => [relacio.empresa, ...(relacio.carrecs || [])]),
    ];
}

function resultatPersona(persona) {
    const empreses = persona.relacions || [];
    return {
        type: 'Persona',
        title: persona.nom,
        meta: `${empreses.length.toLocaleString('ca-ES')} ${empreses.length === 1 ? 'empresa vinculada' : 'empreses vinculades'} · ${formatCompactCurrency(persona.total_adjudicat)}`,
        href: buildRouteUrl('/persones'),
    };
}

function evidenciaPersona(persona) {
    return {
        tipus: 'persona',
        nom: persona.nom,
        import_empreses_vinculades: persona.total_adjudicat,
        relacions: (persona.relacions || []).slice(0, 12).map(relacio => ({
            empresa: relacio.empresa,
            carrecs: relacio.carrecs,
            import_adjudicat_empresa: relacio.import_empresa,
        })),
    };
}

function resultatSubvencio(subvencio) {
    return {
        type: 'Subvenció',
        title: subvencio.descripcion,
        meta: `${subvencio.adjudicatario} · ${formatCompactCurrency(subvencio.importe)} · ${formatDate(subvencio.fecha)}`,
        href: buildRouteUrl(`/entitats/${subvencio.entitat_slug}`),
    };
}

function evidenciaSubvencio(subvencio) {
    return {
        tipus: 'subvencio',
        codi: subvencio.codigo,
        objecte: subvencio.descripcion,
        entitat_beneficiaria: subvencio.adjudicatario,
        import: subvencio.importe,
        data: subvencio.fecha,
        finalitat_publica: subvencio.finalitat_p_blica,
    };
}

function resumAlertaAssistent(alerta, tipus) {
    if (tipus === 'concentracio') {
        return `${alerta.sector || 'Sector no indicat'} · ${formatCompactCurrency(alerta.import_concentrat || alerta.import_sector || 0)}`;
    }
    if (tipus === 'dependencia') {
        return `${alerta.entitat || 'Entitat no indicada'} · ${formatCompactCurrency(alerta.import_total || 0)}`;
    }
    const company = alerta.empresa || (alerta.empreses || []).join(', ') || 'Empresa no indicada';
    return `${company} · ${formatCompactCurrency(alerta.import_total || 0)}`;
}

function dadesCercaAlerta(alerta, tipus) {
    const contracts = alerta.contractes || [];
    return [
        tipus,
        alerta.id,
        alerta.empresa,
        alerta.entitat,
        alerta.sector,
        alerta.empresa_dominant,
        ...(alerta.empreses || []),
        ...(alerta.motius || []),
        ...contracts.flatMap(contract => [contract.descripcion, contract.adjudicatario, contract.codigo]),
    ];
}

async function generaRespostaAssistent(payload, turnstileToken) {
    const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const endpoint = window.__IGUADATA_ASSISTANT_ENDPOINT__
        || (localHost ? assetUrl('/api/assistent') : 'https://iguadata-assistent.vicxvers.workers.dev/api/assistent');
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, turnstileToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.answer) {
        const error = new Error('No s’ha pogut generar la resposta');
        error.code = data.error || 'assistant_error';
        throw error;
    }
    return data.answer;
}

function AssistentIcona({ close = false }) {
    if (close) {
        return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 2.5l19 19M21.5 2.5l-19 19" /></svg>;
    }
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.5c.58 6.18 3.32 8.92 9.5 9.5-6.18.58-8.92 3.32-9.5 9.5-.58-6.18-3.32-8.92-9.5-9.5 6.18-.58 8.92-3.32 9.5-9.5Z" />
        </svg>
    );
}

function AssistentIguadata({ contracts: appContracts, empreses: appEmpreses, visible = true, closeSignal = 0 }) {
    const [open, setOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [baseData, setBaseData] = useState(null);
    const [alertData, setAlertData] = useState(null);
    const [messages, setMessages] = useState([
        {
            id: 'benvinguda-presentacio',
            role: 'assistant',
            text: 'Hola!',
        },
        {
            id: 'benvinguda-identitat',
            role: 'assistant',
            text: "Soc la intel·ligència artificial d'Iguadata.",
        },
        {
            id: 'benvinguda-capacitats',
            role: 'assistant',
            text: "Puc analitzar contractes, empreses, persones i subvencions d'Igualada.",
        },
        {
            id: 'benvinguda-pregunta',
            role: 'assistant',
            text: 'Per on vols començar?',
        },
    ]);
    const inputRef = useRef(null);
    const messagesRef = useRef(null);
    const basePromiseRef = useRef(null);
    const alertPromiseRef = useRef(null);
    const closeTimerRef = useRef(null);
    const closeSignalRef = useRef(closeSignal);
    const turnstileContainerRef = useRef(null);
    const turnstileWidgetRef = useRef(null);
    const turnstileRequestRef = useRef(null);

    const getTurnstileToken = useCallback(async () => {
        const turnstile = await loadAssistentTurnstile();
        const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        return new Promise((resolve, reject) => {
            window.clearTimeout(turnstileRequestRef.current?.timer);
            const finish = (callback, value) => {
                window.clearTimeout(turnstileRequestRef.current?.timer);
                turnstileRequestRef.current = null;
                callback(value);
            };
            turnstileRequestRef.current = {
                resolve: token => finish(resolve, token),
                reject: error => finish(reject, error),
                timer: window.setTimeout(() => finish(reject, new Error('Temps de verificació exhaurit')), 15_000),
            };
            if (turnstileWidgetRef.current === null) {
                turnstileWidgetRef.current = turnstile.render(turnstileContainerRef.current, {
                    sitekey: localHost ? ASSISTENT_TURNSTILE_TEST_SITEKEY : ASSISTENT_TURNSTILE_SITEKEY,
                    action: 'assistant_query',
                    appearance: 'interaction-only',
                    execution: 'execute',
                    callback: token => turnstileRequestRef.current?.resolve(token),
                    'error-callback': () => turnstileRequestRef.current?.reject(new Error('Verificació fallida')),
                    'expired-callback': () => turnstileRequestRef.current?.reject(new Error('Verificació caducada')),
                    'timeout-callback': () => turnstileRequestRef.current?.reject(new Error('Verificació interrompuda')),
                });
            } else {
                turnstile.reset(turnstileWidgetRef.current);
            }
            turnstile.execute(turnstileWidgetRef.current);
        });
    }, []);

    const openAssistant = () => {
        if (!visible) return;
        window.clearTimeout(closeTimerRef.current);
        setClosing(false);
        setOpen(true);
    };

    const closeAssistant = useCallback(() => {
        if (!open || closing) return;
        setClosing(true);
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = window.setTimeout(() => {
            setOpen(false);
            setClosing(false);
        }, 240);
    }, [open, closing]);

    useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);
    useEffect(() => () => window.clearTimeout(turnstileRequestRef.current?.timer), []);

    useLayoutEffect(() => {
        if (closeSignal === closeSignalRef.current) return;
        closeSignalRef.current = closeSignal;
        closeAssistant();
    }, [closeSignal, closeAssistant]);

    useEffect(() => {
        if (!visible && open && !closing) closeAssistant();
    }, [visible, open, closing, closeAssistant]);

    const loadBaseData = useCallback(async () => {
        if (baseData) return baseData;
        if (basePromiseRef.current) return basePromiseRef.current;
        basePromiseRef.current = Promise.all([
            appContracts.length && appEmpreses.length
                ? Promise.resolve({ contracts: appContracts, empreses: appEmpreses })
                : fetchCoreData(),
            fetchJsonDataset('/json/investigacio.json', 'Investigacions').catch(() => []),
            fetchJsonDataset('/json/persones.json', 'Persones').catch(() => []),
            fetchJsonDataset('/json/subvencions.json', 'Subvencions').catch(() => []),
        ]).then(([core, investigacions, persones, subvencions]) => {
            const loaded = {
                ...core,
                investigacions: Array.isArray(investigacions) ? investigacions : [],
                persones: Array.isArray(persones) ? persones : [],
                subvencions: Array.isArray(subvencions) ? subvencions : [],
            };
            setBaseData(loaded);
            return loaded;
        }).finally(() => { basePromiseRef.current = null; });
        return basePromiseRef.current;
    }, [baseData, appContracts, appEmpreses]);

    const loadAlertData = useCallback(async () => {
        if (alertData) return alertData;
        if (alertPromiseRef.current) return alertPromiseRef.current;
        alertPromiseRef.current = Promise.all([
            fetchJsonDataset('/json/fraccionament.json', 'Fraccionament'),
            fetchJsonDataset('/json/concentracio.json', 'Concentració'),
            fetchJsonDataset('/json/electoralisme.json', 'Electoralisme'),
            fetchJsonDataset('/json/dependencia.json', 'Dependència'),
        ]).then(([fraccionament, concentracio, electoralisme, dependencia]) => {
            const loaded = {
                fraccionament: fraccionament.alertes || [],
                concentracio: concentracio.alertes || [],
                electoralisme: electoralisme.alertes || [],
                dependencia: dependencia.alertes || [],
            };
            setAlertData(loaded);
            return loaded;
        }).finally(() => { alertPromiseRef.current = null; });
        return alertPromiseRef.current;
    }, [alertData]);

    useEffect(() => {
        if (!open) return;
        loadBaseData().catch(() => { });
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [open, loadBaseData]);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = event => {
            if (event.key === 'Escape') closeAssistant();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, closeAssistant]);

    useEffect(() => {
        const node = messagesRef.current;
        if (node) node.scrollTop = node.scrollHeight;
    }, [messages, loading]);

    const answerQuestion = async rawQuestion => {
        const query = rawQuestion.trim();
        if (!query || loading) return;
        const userMessage = { id: `usuari-${Date.now()}`, role: 'user', text: query };
        setMessages(current => [...current, userMessage]);
        setQuestion('');
        setLoading(true);

        try {
            const base = await loadBaseData();
            const normalized = normalitzaTextAssistent(query);
            const previousUserQuestion = [...messages].reverse().find(message => message.role === 'user')?.text || '';
            const previousAlertIds = extreuIdsAlertaAssistent(previousUserQuestion);
            const currentAlertIds = extreuIdsAlertaAssistent(query);
            const isAlertContinuation = previousAlertIds.length > 0
                && /alert|fraccion|elector|concentr|dependen|risc|lcsp|contract|import/.test(normalized);
            const isFollowUp = previousUserQuestion && (
                /^(i |el |la |els |les |aixo|aquest|aquesta|sobre |per que|com )/.test(normalized)
                || paraulesConsultaAssistent(query).length <= 2
                || isAlertContinuation
            );
            const retrievalQuery = isFollowUp ? `${previousUserQuestion} ${query}` : query;
            const retrievalNormalized = normalitzaTextAssistent(retrievalQuery);
            const alertIds = [...new Set([
                ...currentAlertIds,
                ...(isAlertContinuation ? previousAlertIds : []),
            ])];
            const yearMatch = retrievalNormalized.match(/\b(20\d{2})\b/);
            const year = yearMatch ? Number(yearMatch[1]) : null;
            const wantsAlerts = alertIds.length > 0 || /alert|fraccion|elector|concentr|dependen|risc/.test(retrievalNormalized);
            const wantsInvestigations = /investig|reportatge|casos publicats/.test(retrievalNormalized);
            const wantsTopCompanies = /(mes contractes|principals empreses|mes adjudicacions|ranking)/.test(retrievalNormalized);
            const wantsTopPeople = /persones.*mes empreses/.test(retrievalNormalized);
            const wantsPeople = wantsTopPeople || /^(qui es|quina persona|quin persona)|\bpersones?\b/.test(retrievalNormalized);
            const wantsTopContracts = /contractes.*imports.*alts|contractes mes cars/.test(retrievalNormalized);
            const wantsSubsidies = /subvenc/.test(retrievalNormalized);
            const wantsLatestContracts = /ultims contractes|contractes recents/.test(retrievalNormalized);
            const wantsTopSubsidyEntities = /entitats.*reben.*mes subvencions/.test(retrievalNormalized);
            let responseText = '';
            let results = [];
            let evidence = [];

            if (esSalutacioAssistent(query)) {
                responseText = 'L’usuari està saludant. Respon de manera breu i convida’l a consultar o analitzar les dades d’Iguadata.';
            } else if (wantsLatestContracts) {
                const contracts = base.contracts
                    .filter(contract => !year || contract.año === year)
                    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
                results = contracts.slice(0, 6).map(contract => ({
                    type: 'Contracte',
                    title: contract.descripcion,
                    meta: `${contract.adjudicatario} · ${formatCompactCurrency(contract.importe)} · ${formatDate(contract.fecha)}`,
                    href: buildRouteUrl(`/contractes/${contract.slug || buildContractSlug(contract)}`),
                }));
                evidence = contracts.slice(0, 10).map(contract => ({
                    tipus: 'contracte',
                    codi: contract.codigo,
                    objecte: contract.descripcion,
                    empresa: contract.adjudicatario,
                    import: contract.importe,
                    data: contract.fecha,
                }));
                responseText = `Aquests són els contractes més recents${year ? ` de ${year}` : ''} publicats a Iguadata.`;
            } else if (wantsTopContracts) {
                const contracts = base.contracts
                    .filter(contract => !year || contract.año === year)
                    .sort((a, b) => (Number(b.importe) || 0) - (Number(a.importe) || 0));
                results = contracts.slice(0, 6).map(contract => ({
                    type: 'Contracte',
                    title: contract.descripcion,
                    meta: `${contract.adjudicatario} · ${formatCompactCurrency(contract.importe)} · ${formatDate(contract.fecha)}`,
                    href: buildRouteUrl(`/contractes/${contract.slug || buildContractSlug(contract)}`),
                }));
                evidence = contracts.slice(0, 10).map(contract => ({
                    tipus: 'contracte',
                    codi: contract.codigo,
                    objecte: contract.descripcion,
                    empresa: contract.adjudicatario,
                    import: contract.importe,
                    data: contract.fecha,
                }));
                responseText = `Aquests són els contractes amb els imports d’adjudicació més alts${year ? ` de ${year}` : ''}.`;
            } else if (wantsTopSubsidyEntities) {
                const entities = Array.from(base.subvencions.reduce((groups, subvencio) => {
                    const name = subvencio.adjudicatario;
                    const current = groups.get(name) || {
                        nom: name,
                        slug: subvencio.entitat_slug,
                        subvencions: 0,
                        import_total: 0,
                    };
                    current.subvencions += 1;
                    current.import_total += Number(subvencio.importe) || 0;
                    groups.set(name, current);
                    return groups;
                }, new Map()).values())
                    .sort((a, b) => b.subvencions - a.subvencions || b.import_total - a.import_total);
                results = entities.slice(0, 6).map(entity => ({
                    type: 'Entitat',
                    title: entity.nom,
                    meta: `${entity.subvencions.toLocaleString('ca-ES')} subvencions · ${formatCompactCurrency(entity.import_total)}`,
                    href: buildRouteUrl(`/entitats/${entity.slug}`),
                }));
                evidence = entities.slice(0, 10).map(entity => ({
                    tipus: 'entitat_subvencionada',
                    nom: entity.nom,
                    subvencions: entity.subvencions,
                    import_total: entity.import_total,
                }));
                responseText = 'Aquestes són les entitats que acumulen més concessions de subvencions a Iguadata.';
            } else if (wantsSubsidies) {
                const meaningfulWords = paraulesConsultaAssistent(retrievalQuery);
                const subsidies = base.subvencions
                    .filter(subvencio => !year || subvencio.año === year)
                    .filter(subvencio => !meaningfulWords.length || coincideixConsultaAssistent(
                        retrievalQuery,
                        [subvencio.descripcion, subvencio.adjudicatario, subvencio.codigo, subvencio.finalitat_p_blica]
                    ))
                    .sort((a, b) => (Number(b.importe) || 0) - (Number(a.importe) || 0));
                results = subsidies.slice(0, 6).map(subvencio => resultatSubvencio(subvencio));
                evidence = subsidies.slice(0, 10).map(subvencio => evidenciaSubvencio(subvencio));
                responseText = subsidies.length
                    ? `He trobat ${subsidies.length.toLocaleString('ca-ES')} subvencions. Et mostro les de més import${year ? ` de ${year}` : ''}.`
                    : 'No he trobat cap subvenció que coincideixi amb la consulta.';
            } else if (wantsPeople) {
                const matches = base.persones
                    .map(persona => ({
                        persona,
                        score: puntuacioAssistent(retrievalQuery, dadesCercaPersona(persona)),
                    }))
                    .filter(match => wantsTopPeople || coincideixConsultaAssistent(
                        retrievalQuery,
                        dadesCercaPersona(match.persona)
                    ))
                    .sort((a, b) => wantsTopPeople
                        ? (b.persona.relacions?.length || 0) - (a.persona.relacions?.length || 0)
                        : b.score - a.score || (b.persona.total_adjudicat || 0) - (a.persona.total_adjudicat || 0));
                results = matches.slice(0, 6).map(({ persona }) => resultatPersona(persona));
                evidence = matches.slice(0, 8).map(({ persona }) => evidenciaPersona(persona));
                responseText = matches.length
                    ? `He trobat ${matches.length.toLocaleString('ca-ES')} persones relacionades amb la consulta. Els imports corresponen a les empreses vinculades, no a un benefici personal.`
                    : 'No he trobat cap persona que coincideixi amb la consulta.';
            } else if (wantsTopCompanies) {
                const companies = year
                    ? Array.from(base.contracts
                        .filter(contract => contract.año === year)
                        .reduce((groups, contract) => {
                            const current = groups.get(contract.adjudicatario) || {
                                nom: contract.adjudicatario,
                                num_contratos: 0,
                                total_importe: 0,
                            };
                            current.num_contratos += 1;
                            current.total_importe += Number(contract.importe) || 0;
                            groups.set(contract.adjudicatario, current);
                            return groups;
                        }, new Map()).values())
                    : [...base.empreses];
                companies.sort((a, b) => b.num_contratos - a.num_contratos);
                results = companies.slice(0, 6).map(company => ({
                    type: 'Empresa',
                    title: company.nom,
                    meta: `${company.num_contratos.toLocaleString('ca-ES')} contractes · ${formatCompactCurrency(company.total_importe)}`,
                    href: buildRouteUrl(`/empreses/${company.slug || buildEmpresaSlug(company.nom)}`),
                }));
                evidence = companies.slice(0, 12).map(company => ({
                    tipus: 'empresa',
                    nom: company.nom,
                    contractes: company.num_contratos,
                    import_total: company.total_importe,
                    any: year,
                }));
                responseText = year
                    ? `Aquestes són les empreses amb més contractes entre els resultats de ${year}.`
                    : 'Aquestes són les empreses amb més contractes registrats a Iguadata.';
            } else if (wantsAlerts) {
                const alerts = await loadAlertData();
                const requestedTypes = [];
                if (/fraccion/.test(normalized)) requestedTypes.push('fraccionament');
                if (/concentr/.test(normalized)) requestedTypes.push('concentracio');
                if (/elector/.test(normalized)) requestedTypes.push('electoralisme');
                if (/dependen/.test(normalized)) requestedTypes.push('dependencia');
                for (const id of alertIds) {
                    if (id.startsWith('FR-')) requestedTypes.push('fraccionament');
                    if (id.startsWith('CO-')) requestedTypes.push('concentracio');
                    if (id.startsWith('EL-')) requestedTypes.push('electoralisme');
                    if (id.startsWith('DE-')) requestedTypes.push('dependencia');
                }
                const types = requestedTypes.length ? [...new Set(requestedTypes)] : Object.keys(alerts);
                const matches = types.flatMap(type => alerts[type].map(item => ({
                    item,
                    type,
                    score: puntuacioAssistent(retrievalQuery, dadesCercaAlerta(item, type)),
                })))
                    .filter(match => {
                        if (year) {
                            const dates = [match.item.data_inici, match.item.data_fi, ...(match.item.contractes || []).map(contract => contract.fecha)];
                            if (!dates.some(date => String(date || '').startsWith(String(year)))) return false;
                        }
                        if (alertIds.length) return alertIds.includes(String(match.item.id || '').toUpperCase());
                        return coincideixConsultaAssistent(retrievalQuery, dadesCercaAlerta(match.item, match.type), true);
                    })
                    .sort((a, b) => b.score - a.score || (b.item.risc || 0) - (a.item.risc || 0));
                results = matches.slice(0, 6).map(({ item, type }) => ({
                    type: `Alerta · ${type === 'concentracio' ? 'concentració' : type === 'dependencia' ? 'dependència' : type}`,
                    title: item.id || item.empresa || item.entitat || item.sector,
                    meta: resumAlertaAssistent(item, type),
                    href: buildRouteUrl(`/analisi/${type}/${item.id}`),
                }));
                evidence = matches.slice(0, 10).map(({ item, type }) => ({
                    tipus: 'alerta',
                    categoria: type,
                    id: item.id,
                    nivell: item.nivell,
                    risc: item.risc,
                    nombre_contractes: item.contractes_count || (item.contractes || []).length,
                    empresa: item.empresa || item.empresa_dominant || (item.empreses || []).join(', '),
                    empreses: item.empreses,
                    administradors_comuns: item.administradors_comuns,
                    entitat: item.entitat,
                    sector: item.sector,
                    import_total: item.import_total || item.import_concentrat || item.import_sector,
                    limit_contracte_menor: item.limit_legal,
                    tipus_limit: item.tipus_limit,
                    dies_entre_primer_i_ultim: item.dies_entre_primer_i_ultim,
                    similitud_objecte: item.similitud_objecte,
                    cpv_compartit: item.cpv_compartit,
                    periode: [item.data_inici, item.data_fi].filter(Boolean).join(' — '),
                    motius: (item.motius || []).slice(0, 8),
                    contractes: (item.contractes || []).slice(0, 8).map(contract => ({
                        codi: contract.codigo,
                        objecte: contract.descripcion,
                        empresa: contract.adjudicatario,
                        import: contract.importe,
                        data: contract.fecha,
                    })),
                }));
                responseText = matches.length
                    ? `He trobat ${matches.length.toLocaleString('ca-ES')} alertes relacionades. Et mostro les més rellevants.`
                    : 'No he trobat cap alerta que coincideixi amb aquesta consulta.';
            } else if (wantsInvestigations) {
                const matches = base.investigacions
                    .map(item => ({
                        item,
                        score: puntuacioAssistent(retrievalQuery, dadesCercaInvestigacio(item)),
                    }))
                    .filter(match => coincideixConsultaAssistent(
                        retrievalQuery,
                        dadesCercaInvestigacio(match.item),
                        true
                    ))
                    .sort((a, b) => b.score - a.score);
                results = matches.slice(0, 6).map(({ item }) => resultatInvestigacio(item));
                evidence = matches.slice(0, 6).map(({ item }) => evidenciaInvestigacio(item));
                responseText = matches.length
                    ? `Iguadata té ${matches.length.toLocaleString('ca-ES')} investigacions relacionades amb la consulta.`
                    : 'No he trobat cap investigació relacionada amb aquesta consulta.';
            } else {
                const contractMatches = base.contracts
                    .filter(contract => !year || contract.año === year)
                    .map(contract => ({
                        contract,
                        score: puntuacioAssistent(retrievalQuery, [contract.descripcion, contract.adjudicatario, contract.codigo, contract.tipo, contract.procedimiento]),
                    }))
                    .filter(match => coincideixConsultaAssistent(
                        retrievalQuery,
                        [match.contract.descripcion, match.contract.adjudicatario, match.contract.codigo, match.contract.tipo, match.contract.procedimiento],
                        Boolean(year)
                    ))
                    .sort((a, b) => b.score - a.score || (b.contract.importe || 0) - (a.contract.importe || 0));
                const companyMatches = base.empreses
                    .map(company => ({ company, score: puntuacioAssistent(retrievalQuery, [company.nom, company.sector, company.categoria]) }))
                    .filter(match => coincideixConsultaAssistent(
                        retrievalQuery,
                        [match.company.nom, match.company.sector, match.company.categoria]
                    ))
                    .sort((a, b) => b.score - a.score || b.company.num_contratos - a.company.num_contratos);
                const investigationMatches = base.investigacions
                    .map(item => ({ item, score: puntuacioAssistent(retrievalQuery, dadesCercaInvestigacio(item)) }))
                    .filter(match => coincideixConsultaAssistent(retrievalQuery, dadesCercaInvestigacio(match.item)))
                    .sort((a, b) => b.score - a.score);
                const personMatches = base.persones
                    .map(persona => ({ persona, score: puntuacioAssistent(retrievalQuery, dadesCercaPersona(persona)) }))
                    .filter(match => coincideixConsultaAssistent(retrievalQuery, dadesCercaPersona(match.persona)))
                    .sort((a, b) => b.score - a.score || (b.persona.total_adjudicat || 0) - (a.persona.total_adjudicat || 0));
                const subsidyMatches = base.subvencions
                    .map(subvencio => ({
                        subvencio,
                        score: puntuacioAssistent(retrievalQuery, [
                            subvencio.descripcion,
                            subvencio.adjudicatario,
                            subvencio.codigo,
                            subvencio.finalitat_p_blica,
                        ]),
                    }))
                    .filter(match => coincideixConsultaAssistent(retrievalQuery, [
                        match.subvencio.descripcion,
                        match.subvencio.adjudicatario,
                        match.subvencio.codigo,
                        match.subvencio.finalitat_p_blica,
                    ]))
                    .sort((a, b) => b.score - a.score || (b.subvencio.importe || 0) - (a.subvencio.importe || 0));
                const genericAlerts = await loadAlertData();
                const alertMatches = Object.entries(genericAlerts)
                    .flatMap(([type, items]) => items.map(item => ({
                        item,
                        type,
                        score: puntuacioAssistent(retrievalQuery, dadesCercaAlerta(item, type)),
                    })))
                    .filter(match => coincideixConsultaAssistent(retrievalQuery, dadesCercaAlerta(match.item, match.type)))
                    .sort((a, b) => b.score - a.score || (b.item.risc || 0) - (a.item.risc || 0));
                const contractResults = contractMatches.slice(0, companyMatches.length ? 4 : 6).map(({ contract }) => ({
                    type: 'Contracte',
                    title: contract.descripcion,
                    meta: `${contract.adjudicatario} · ${formatCompactCurrency(contract.importe)} · ${formatDate(contract.fecha)}`,
                    href: buildRouteUrl(`/contractes/${contract.slug || buildContractSlug(contract)}`),
                }));
                const companyResults = companyMatches.slice(0, 2).map(({ company }) => ({
                    type: 'Empresa',
                    title: company.nom,
                    meta: `${company.num_contratos.toLocaleString('ca-ES')} contractes · ${formatCompactCurrency(company.total_importe)}`,
                    href: buildRouteUrl(`/empreses/${company.slug || buildEmpresaSlug(company.nom)}`),
                }));
                const investigationResults = investigationMatches.slice(0, 2).map(({ item }) => resultatInvestigacio(item));
                const personResults = personMatches.slice(0, 1).map(({ persona }) => resultatPersona(persona));
                const subsidyResults = subsidyMatches.slice(0, 2).map(({ subvencio }) => resultatSubvencio(subvencio));
                const alertResults = alertMatches.slice(0, 2).map(({ item, type }) => ({
                    type: `Alerta · ${type === 'concentracio' ? 'concentració' : type === 'dependencia' ? 'dependència' : type}`,
                    title: item.id || item.empresa || item.entitat || item.sector,
                    meta: resumAlertaAssistent(item, type),
                    href: buildRouteUrl(`/analisi/${type}/${item.id}`),
                }));
                results = [
                    ...investigationResults,
                    ...alertResults,
                    ...personResults,
                    ...companyResults,
                    ...subsidyResults,
                    ...contractResults,
                ].slice(0, 6);
                if (contractMatches.length || investigationMatches.length || personMatches.length || subsidyMatches.length || alertMatches.length) {
                    const total = contractMatches.reduce((sum, match) => sum + (Number(match.contract.importe) || 0), 0);
                    const parts = [];
                    if (investigationMatches.length) parts.push(`${investigationMatches.length.toLocaleString('ca-ES')} investigacions`);
                    if (alertMatches.length) parts.push(`${alertMatches.length.toLocaleString('ca-ES')} alertes`);
                    if (personMatches.length) parts.push(`${personMatches.length.toLocaleString('ca-ES')} persones`);
                    if (subsidyMatches.length) parts.push(`${subsidyMatches.length.toLocaleString('ca-ES')} subvencions`);
                    if (contractMatches.length) parts.push(`${contractMatches.length.toLocaleString('ca-ES')} contractes per un import total de ${formatCurrency(total)}`);
                    responseText = `He trobat ${parts.join(' i ')} relacionats amb la consulta.`;
                    evidence = [
                        { tipus: 'resum', investigacions: investigationMatches.length, contractes: contractMatches.length, import_total: total, any: year },
                        ...investigationMatches.slice(0, 4).map(({ item }) => evidenciaInvestigacio(item)),
                        ...alertMatches.slice(0, 4).map(({ item, type }) => ({
                            tipus: 'alerta',
                            categoria: type,
                            id: item.id,
                            nivell: item.nivell,
                            risc: item.risc,
                            empresa: item.empresa || item.empresa_dominant || (item.empreses || []).join(', '),
                            entitat: item.entitat,
                            sector: item.sector,
                            import_total: item.import_total || item.import_concentrat || item.import_sector,
                            motius: (item.motius || []).slice(0, 8),
                        })),
                        ...personMatches.slice(0, 3).map(({ persona }) => evidenciaPersona(persona)),
                        ...subsidyMatches.slice(0, 4).map(({ subvencio }) => evidenciaSubvencio(subvencio)),
                        ...companyMatches.slice(0, 4).map(({ company }) => ({
                            tipus: 'empresa',
                            nom: company.nom,
                            contractes: company.num_contratos,
                            import_total: company.total_importe,
                        })),
                        ...contractMatches.slice(0, 12).map(({ contract }) => ({
                            tipus: 'contracte',
                            codi: contract.codigo,
                            objecte: contract.descripcion,
                            empresa: contract.adjudicatario,
                            import: contract.importe,
                            data: contract.fecha,
                            procediment: contract.procedimiento,
                        })),
                    ];
                } else if (companyMatches.length) {
                    responseText = `He trobat ${companyMatches.length.toLocaleString('ca-ES')} empreses relacionades.`;
                    evidence = companyMatches.slice(0, 12).map(({ company }) => ({
                        tipus: 'empresa',
                        nom: company.nom,
                        contractes: company.num_contratos,
                        import_total: company.total_importe,
                        sector: company.sector,
                    }));
                } else {
                    responseText = 'No he trobat coincidències. Prova amb el nom d’una empresa, un lloc, un concepte o un any.';
                }
            }

            const turnstileToken = await getTurnstileToken();
            responseText = await generaRespostaAssistent({
                question: query,
                history: messages.slice(-8).map(message => ({ role: message.role, text: message.text })),
                contextSummary: responseText,
                evidence,
            }, turnstileToken);

            setMessages(current => [...current, {
                id: `resposta-${Date.now()}`,
                role: 'assistant',
                text: responseText,
                results,
            }]);
        } catch (error) {
            console.error('Error de l’assistent:', error);
            const errorText = error.code === 'assistant_not_configured'
                ? 'L’assistent generatiu encara no té configurada la clau API en aquest entorn.'
                : error.code === 'assistant_rate_limited'
                    ? 'Hi ha massa consultes en aquest moment. Torna-ho a provar d’aquí a un minut.'
                    : error.code === 'assistant_verification_failed'
                        ? 'No he pogut verificar la consulta. Torna-ho a provar d’aquí a uns segons.'
                    : 'No he pogut generar la resposta ara mateix. Torna-ho a provar d’aquí a uns segons.';
            setMessages(current => [...current, {
                id: `error-${Date.now()}`,
                role: 'assistant',
                text: errorText,
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = event => {
        event.preventDefault();
        answerQuestion(question);
    };

    return (
        <div className={`iguadata-assistent${open ? ' is-open' : ''}`}>
            {open && (
                <section className={`assistent-panel${closing ? ' is-closing' : ''}`} role="dialog" aria-label="Assistent de cerca d’Iguadata">
                    <header className="assistent-header">
                        <h2 className="assistent-title">Assistent d’Iguadata</h2>
                        <button type="button" className="assistent-close" onClick={closeAssistant} aria-label="Tanca l’assistent">
                            <AssistentIcona close />
                        </button>
                    </header>

                    <div className="assistent-messages" ref={messagesRef} aria-live="polite">
                        {messages.map(message => (
                            <div key={message.id} className={`assistent-message is-${message.role}`}>
                                <p>{message.text}</p>
                                {message.results?.length > 0 && (
                                    <div className="assistent-results">
                                        {message.results.map((result, index) => (
                                            <a key={`${message.id}-${index}`} className="assistent-result" href={result.href}>
                                                <span className="assistent-result-type">{result.type}</span>
                                                <strong>{result.title}</strong>
                                                <span>{result.meta}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {messages.length === 4 && (
                            <div className="assistent-suggestions" aria-label="Preguntes suggerides">
                                {ASSISTENT_SUGGERIMENTS.map(suggestion => (
                                    <button key={suggestion} type="button" onClick={() => answerQuestion(suggestion)}>{suggestion}</button>
                                ))}
                            </div>
                        )}
                        {loading && <div className="assistent-thinking" role="status"><span></span><span></span><span></span><span className="sr-only">Cercant</span></div>}
                    </div>

                    <form className="assistent-form" onSubmit={handleSubmit}>
                        <label className="sr-only" htmlFor="assistent-question">Escriu una pregunta</label>
                        <input
                            ref={inputRef}
                            id="assistent-question"
                            value={question}
                            onChange={event => setQuestion(event.target.value)}
                            placeholder="Pregunta a Iguadata"
                            autoComplete="off"
                            maxLength="180"
                            disabled={loading}
                        />
                        <button type="submit" disabled={!question.trim() || loading} aria-label="Envia la pregunta">
                            <em className="share-arrow" aria-hidden="true"></em>
                        </button>
                    </form>
                    <div className="assistent-turnstile" ref={turnstileContainerRef}></div>
                    <p className="assistent-note">IA generativa basada en les dades públiques d’Iguadata.</p>
                </section>
            )}

            {(visible || open) && (
                <button
                    type="button"
                    className="assistent-trigger"
                    onClick={() => open ? closeAssistant() : openAssistant()}
                    aria-label={open ? 'Tanca l’assistent' : 'Obre l’assistent de cerca'}
                    aria-expanded={open && !closing}
                >
                    <span className="assistent-trigger-icon is-spark"><AssistentIcona /></span>
                    <span className="assistent-trigger-icon is-close"><AssistentIcona close /></span>
                </button>
            )}
        </div>
    );
}
