const { useState, useMemo, useEffect, useCallback, useRef } = React;

/* ---- useCountUp ------------------------------------------------- */
function useCountUp(target, duration, active) {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const hasActivatedRef = useRef(false);
    const isActive = Boolean(active);

    useEffect(() => {
        if (!isActive) {
            if (!hasActivatedRef.current) {
                countRef.current = 0;
                setCount(0);
            }
            return;
        }

        hasActivatedRef.current = true;
        const nextTarget = Number(target) || 0;
        const startValue = countRef.current;
        if (startValue === nextTarget) return;

        const startedAt = performance.now();
        let frameId;
        const tick = (now) => {
            const progress = Math.min(1, (now - startedAt) / duration);
            const current = startValue + (nextTarget - startValue) * progress;
            const displayed = nextTarget >= startValue ? Math.floor(current) : Math.ceil(current);
            countRef.current = displayed;
            setCount(displayed);

            if (progress < 1) {
                frameId = requestAnimationFrame(tick);
            } else {
                countRef.current = nextTarget;
                setCount(nextTarget);
            }
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [target, duration, isActive]);

    return count;
}

/* ---- Helpers ---------------------------------------------------- */
function formatCurrency(amount) {
    return new Intl.NumberFormat('ca-ES', {
        style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(amount);
}

function formatCompactCurrency(amount) {
    const value = Number(amount) || 0;
    if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toLocaleString('ca-ES', { maximumFractionDigits: 1 })}M €`;
    }
    if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toLocaleString('ca-ES', { maximumFractionDigits: 0 })}k €`;
    }
    return formatCurrency(value);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const p = dateStr.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dateStr;
}

function formatTipus(tipo) {
    const m = {
        '1. OBRES': 'Obres',
        'OBRES': 'Obres',
        '3. SUBMINISTRAMENTS': 'Subministraments',
        'SUBMINISTRAMENTS': 'Subministraments',
        '5. SERVEIS': 'Serveis',
        'SERVEIS': 'Serveis',
        '6. ADMINISTRATIU ESPECIAL': 'Administratiu especial',
        'ADMINISTRATIU ESPECIAL': 'Administratiu especial',
        '2. GESTIÓ DE SERVEI PÚBLIC': 'Gestió de servei públic',
        'GESTIÓ DE SERVEI PÚBLIC': 'Gestió de servei públic',
        '8. CONCESSIÓ DE SERVEIS': 'Concessió de serveis',
        '8. CONCESSÍÓ DE SERVEIS': 'Concessió de serveis',
        'CONCESSIÓ DE SERVEIS': 'Concessió de serveis',
        "10. PRIVAT D'ADMINISTRACIO PUBLICA": "Privat d'administració pública",
        "PRIVAT D'ADMINISTRACIO PUBLICA": "Privat d'administració pública"
    };
    return m[tipo] || tipo;
}


function formatTipusLimit(t) {
    const m = { 'obres': 'Obres', 'serveis': 'Serveis', 'subministraments': 'Subministraments' };
    return m[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : '—');
}

function formatMotiuFraccionament(motiu) {
    const m = {
        'Mateixa empresa adjudicataria': 'Mateixa empresa adjudicatària',
        'Contractes menors amb la mateixa empresa adjudicataria': 'Contractes menors amb la mateixa empresa adjudicatària',
        'Empreses connectades per administrador comu': 'Empreses connectades per administrador comú',
        'Mateixa divisio CPV': "Mateix sector d'activitat",
        'Import acumulat superior al limit legal del contracte menor': 'Import acumulat superior al límit legal',
        'Import acumulat proper al limit legal del contracte menor': 'Import acumulat proper al límit legal',
        'Almenys una fraccio queda prop del limit individual': 'Almenys una fracció propera al límit legal',
        'Contracte menor superior al limit legal': 'Contracte menor superior al límit legal',
        'Contracte menor molt proper al limit legal': 'Contracte menor molt proper al límit legal',
        'Contracte menor proper al limit legal': 'Contracte menor proper al límit legal',
        'Imports rodons o ajustats al llindar': 'Imports rodons o ajustats al llindar',
        'Repeticio multianual del mateix objecte': 'Repetició multianual del mateix objecte',
        'Contractes en exercicis diferents': 'Contractes en exercicis diferents',
        'Imports individuals propers al limit legal': 'Imports individuals propers al límit legal'
    };
    return m[motiu] || motiu;
}

function formatPercent(value) {
    return `${Math.round((Number(value) || 0) * 100)}%`;
}

function quotaClass(value) {
    const percent = Math.round((Number(value) || 0) * 100);
    if (percent < 25) return 'success';
    if (percent < 50) return 'warn';
    return 'danger';
}

function formatSectorName(sector) {
    return sector === 'Altres Serveis i Subministraments' ? 'Altres' : sector;
}

function formatConcentracioPeriod(caso) {
    if (caso?.finestra === 'historic') return caso.finestra_label;
    return `Del ${formatDate(caso.data_inici)} al ${formatDate(caso.data_fi)}`;
}

function formatProcediment(proc) {
    const m = {
        'Menor': 'Menor',
        'Obert': 'Obert',
        'Negociat sense publicitat': 'Negociat sense publicitat',
        'Licitació amb negociació': 'Licitació amb negociació',
        'Adjudicacions directes no menors': 'Adjudicació directa',
        'Adjudicació directa': 'Adjudicació directa',
        'Específic de sistema dinàmic de contractació': 'Sistema dinàmic',
        'Sistema dinàmic': 'Sistema dinàmic'
    };
    return m[proc] || proc;
}

function riskClass(n) {
    return n === 'CRITIC' ? 'alto' : (n === 'ALT' || n === 'ALTO') ? 'mitja' : (n === 'OBSERVACIO' || n === 'MITJÀ') ? 'baix' : 'baix';
}

function riskLabel(n) {
    if (n === 'CRITIC') return 'Risc alt';
    if (n === 'ALT' || n === 'ALTO') return 'Risc mitjà';
    if (n === 'OBSERVACIO' || n === 'MITJÀ') return 'Risc baix';
    return 'Risc baix';
}

function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function matchesSearchQuery(values, query) {
    const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return true;

    const target = normalizeSearchText(Array.isArray(values) ? values.join(' ') : values);
    return terms.every(term => target.includes(term));
}

function normalizeContractCode(value) {
    return String(value || '')
        .toUpperCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s*([/.-])\s*/g, '$1');
}

function looksLikeContractCodeQuery(query) {
    return /\d\s*[/.-]\s*\d/.test(String(query || ''));
}

function contractCodeStartsWithQuery(code, query) {
    const normalizedCode = normalizeContractCode(code);
    const normalizedQuery = normalizeContractCode(query);
    if (!normalizedQuery || !normalizedCode.startsWith(normalizedQuery)) return false;
    const nextCharacter = normalizedCode.charAt(normalizedQuery.length);
    return !nextCharacter || !/[A-Z0-9]/.test(nextCharacter);
}

function filterContractsBySearch(contracts, query, searchableValues) {
    if (!query) return contracts;
    if (looksLikeContractCodeQuery(query)) {
        const codeMatches = contracts.filter(contract => contractCodeStartsWithQuery(contract.codigo, query));
        if (codeMatches.length) return codeMatches;
    }
    return contracts.filter(contract => matchesSearchQuery(searchableValues(contract), query));
}

// Hash determinista de 53 bits (cyrb53). Sempre retorna el mateix valor per al mateix input.
function cyrb53(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function slugify(str) {
    return (str || '')
        .toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // treu accents
        .toLowerCase()
        .replace(/['"`´]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

function stableHash(values) {
    const canonical = values
        .map(v => v == null ? '' : String(v).trim())
        .join('|');
    return cyrb53(canonical).toString(36).padStart(11, '0').slice(-7);
}

const CASOS_INVESTIGACIO_FALLBACK = [
    {
        slug: 'passeig-verdaguer',
        title: 'Passeig Verdaguer',
        subtitle: 'Cinc contractes a dit per començar la remodelació',
        publishedAt: '2026-06-22',
        image: '/assets/investigacio/passeig-verdaguer.webp',
        importe: 65500
    },
    {
        slug: 'neteja-parc-central',
        title: 'Neteja del Parc Central',
        subtitle: "Un contracte il·legal després d'anys al límit",
        importe: 58062.93
    },
    {
        slug: 'llums-de-nadal',
        title: 'Llums de Nadal',
        subtitle: 'Quatre anys, un mateix proveïdor i preus calcats al límit legal',
        importe: 59171.05
    },
    {
        slug: 'igualada-urban-running',
        title: 'Igualada Urban Running',
        subtitle: 'Cursa de contractes amb un sol guanyador durant anys',
        importe: 66413.80
    },
    {
        slug: 'la-masuca',
        title: 'La Masuca',
        subtitle: 'Dos contractes per a dues empreses connectades',
        importe: 29700
    },
    {
        slug: 'zones-verdes-igualada',
        title: "Zones verdes d'Igualada",
        subtitle: 'Set contractes, un mateix servei i imports al límit legal',
        importe: 104260
    },
    {
        slug: 'parc-central',
        title: 'Parc Central',
        subtitle: 'Quatre contractes, una mateixa actuació i imports al límit legal',
        importe: 58900
    }
];

// Slug estable per a contractes: YYYY-MM-DD-codi-expedient
function buildContractSlug(c) {
    const date = (c.fecha || '0000-00-00').slice(0, 10);
    const codeSlug = slugify(c.codigo);
    if (codeSlug) return `${date}-${codeSlug}`;
    const empSlug = slugify(c.adjudicatario) || 'sense-adjudicatari';
    const h = stableHash([c.fecha, c.importe, c.adjudicatario]);
    return `${date}-${empSlug}-${h}`;
}

function buildLegacyContractSlug(c) {
    const date = (c.fecha || '0000-00-00').slice(0, 10);
    const empSlug = slugify(c.adjudicatario) || 'sense-adjudicatari';
    const h = stableHash([c.codigo, c.adjudicatario, c.fecha, c.importe, c.cpv, c.descripcion]);
    return `${date}-${empSlug}-${h}`;
}

function contractMatchesSlug(contract, slug) {
    return contract.slug === slug || (contract.slug_aliases || []).includes(slug);
}

function sameContractEvidence(current, frozen) {
    const fields = ['codigo', 'organismo', 'fecha', 'importe', 'adjudicatario', 'descripcion'];
    return fields.every(field => String(current?.[field] ?? '').trim() === String(frozen?.[field] ?? '').trim());
}

function buildEmpresaSlug(name) {
    return slugify(name) || 'sense-nom';
}

function empresaMatchesSlug(empresa, slug) {
    return empresa.slug === slug || (empresa.slug_aliases || []).includes(slug);
}

function buildEmpresaAliasSlugMap(empreses, empresaAliases) {
    const byName = new Map(empreses.map(e => [String(e.nom || '').trim().toUpperCase(), e]));
    const result = new Map();
    for (const [currentName, aliases] of Object.entries((empresaAliases && empresaAliases.aliases) || {})) {
        const empresa = byName.get(String(currentName || '').trim().toUpperCase());
        if (!empresa || !empresa.slug) continue;
        for (const alias of aliases || []) {
            const aliasSlug = buildEmpresaSlug(alias);
            if (aliasSlug && aliasSlug !== empresa.slug) result.set(aliasSlug, empresa.slug);
        }
    }
    return result;
}

function findMatchingContract(contracts, partial) {
    const sameFingerprint = (ct) =>
        String(ct.adjudicatario || '').trim() === String(partial.adjudicatario || '').trim() &&
        String(ct.fecha || '').slice(0, 10) === String(partial.fecha || '').slice(0, 10) &&
        Math.abs((Number(ct.importe) || 0) - (Number(partial.importe) || 0)) < 0.01;
    const sameCode = contracts.filter(ct => String(ct.codigo || '').trim() === String(partial.codigo || '').trim());
    const exactByCode = sameCode.find(sameFingerprint);
    if (exactByCode) return exactByCode;
    if (sameCode.length === 1 && !partial.adjudicatario && !partial.fecha) return sameCode[0];
    return contracts.find(ct =>
        sameFingerprint(ct) &&
        String(ct.descripcion || '').trim() === String(partial.descripcion || '').trim()
    ) || null;
}

/* ---- CPV ? Categoria ? Sector mappings -------------------------- */
const CPV_DIVISIONS = {
    "03": "Productes agrícoles i ramaders",
    "09": "Productes petrolífers i energia",
    "14": "Productes de mineria",
    "15": "Aliments i begudes",
    "16": "Maquinària agrícola",
    "18": "Roba i calçat",
    "19": "Cuir i tèxtils",
    "22": "Impresos i productes relacionats",
    "24": "Productes químics",
    "30": "Maquinària d'oficina i informàtica",
    "31": "Maquinària elèctrica",
    "32": "Equips de telecomunicacions",
    "33": "Equipament mèdic i farmacèutic",
    "34": "Equips de transport",
    "35": "Equips de seguretat i defensa",
    "37": "Instruments musicals i esportius",
    "38": "Equips de laboratori i precisió",
    "39": "Mobiliari i equipament",
    "42": "Maquinària industrial",
    "43": "Maquinària de mineria",
    "44": "Materials de construcció",
    "45": "Obres de construcció",
    "48": "Paquets de programari",
    "50": "Serveis de reparació i manteniment",
    "51": "Serveis d'instal·lació",
    "55": "Serveis d'hostaleria i restauració",
    "60": "Serveis de transport",
    "63": "Serveis auxiliars de transport",
    "64": "Serveis postals i telecomunicacions",
    "65": "Serveis públics (aigua, energia)",
    "66": "Serveis financers i d'assegurances",
    "70": "Serveis immobiliaris",
    "71": "Serveis d'arquitectura i enginyeria",
    "72": "Serveis informàtics (TI)",
    "73": "Serveis d'investigació (R+D)",
    "75": "Serveis d'administració pública",
    "76": "Serveis del sector petroler",
    "77": "Serveis agrícoles i forestals",
    "79": "Serveis empresarials i de consultoria",
    "80": "Serveis d'ensenyament i formació",
    "85": "Serveis sanitaris i socials",
    "90": "Aigües residuals, residus i neteja",
    "92": "Serveis recreatius i culturals",
    "98": "Altres serveis comunitaris",
};

const SECTOR_MAPPING = {
    "Productes agrícoles i ramaders": "Agricultura i Alimentació",
    "Productes petrolífers i energia": "Indústria, Maquinària i Energia",
    "Productes de mineria": "Indústria, Maquinària i Energia",
    "Aliments i begudes": "Agricultura i Alimentació",
    "Maquinària agrícola": "Agricultura i Alimentació",
    "Roba i calçat": "Béns de Consum i Comerç",
    "Cuir i tèxtils": "Béns de Consum i Comerç",
    "Impresos i productes relacionats": "Béns de Consum i Comerç",
    "Productes químics": "Indústria, Maquinària i Energia",
    "Maquinària d'oficina i informàtica": "Tecnologia i Telecomunicacions",
    "Maquinària elèctrica": "Indústria, Maquinària i Energia",
    "Equips de telecomunicacions": "Tecnologia i Telecomunicacions",
    "Equipament mèdic i farmacèutic": "Salut i Serveis Socials",
    "Equips de transport": "Transport i Logística",
    "Equips de seguretat i defensa": "Seguretat i Defensa",
    "Instruments musicals i esportius": "Cultura, Oci i Esport",
    "Equips de laboratori i precisió": "Indústria, Maquinària i Energia",
    "Mobiliari i equipament": "Béns de Consum i Comerç",
    "Maquinària industrial": "Indústria, Maquinària i Energia",
    "Maquinària de mineria": "Indústria, Maquinària i Energia",
    "Materials de construcció": "Construcció i Infraestructures",
    "Obres de construcció": "Construcció i Infraestructures",
    "Paquets de programari": "Tecnologia i Telecomunicacions",
    "Serveis de reparació i manteniment": "Medi Ambient, Neteja i Manteniment",
    "Serveis d'instal·lació": "Construcció i Infraestructures",
    "Serveis d'hostaleria i restauració": "Agricultura i Alimentació",
    "Serveis de transport": "Transport i Logística",
    "Serveis auxiliars de transport": "Transport i Logística",
    "Serveis postals i telecomunicacions": "Tecnologia i Telecomunicacions",
    "Serveis públics (aigua, energia)": "Indústria, Maquinària i Energia",
    "Serveis financers i d'assegurances": "Serveis Professionals i Corporatius",
    "Serveis immobiliaris": "Serveis Professionals i Corporatius",
    "Serveis d'arquitectura i enginyeria": "Construcció i Infraestructures",
    "Serveis informàtics (TI)": "Tecnologia i Telecomunicacions",
    "Serveis d'investigació (R+D)": "Educació i Recerca",
    "Serveis d'administració pública": "Serveis Professionals i Corporatius",
    "Serveis del sector petroler": "Indústria, Maquinària i Energia",
    "Serveis agrícoles i forestals": "Agricultura i Alimentació",
    "Serveis empresarials i de consultoria": "Serveis Professionals i Corporatius",
    "Serveis d'ensenyament i formació": "Educació i Recerca",
    "Serveis sanitaris i socials": "Salut i Serveis Socials",
    "Aigües residuals, residus i neteja": "Medi Ambient, Neteja i Manteniment",
    "Serveis recreatius i culturals": "Cultura, Oci i Esport",
    "Altres serveis comunitaris": "Altres Serveis i Subministraments",
};

function categoriaToSector(cat) {
    return SECTOR_MAPPING[cat] || "Altres Serveis i Subministraments";
}

function App() {
    const initialContractSearch = useMemo(() => readContractSearchState(), []);
    const initialAnalysisSearch = useMemo(() => readAnalysisSearchState(), []);
    const tabFromPath = (p) => resolveRoute(p).tab;
    const [activeTab, setActiveTab] = useState(() => tabFromPath(getCurrentRoute()));
    const [pendingEmpresaSlug, setPendingEmpresaSlug] = useState(() => {
        const p = getCurrentRoute();
        return p.startsWith('/empreses/') ? p.slice('/empreses/'.length) : null;
    });
    const [pendingContractSlug, setPendingContractSlug] = useState(() => {
        const p = getCurrentRoute();
        return p.startsWith('/contractes/') ? p.slice('/contractes/'.length) : null;
    });
    const [selectedContractForDetail, setSelectedContractForDetail] = useState(null);
    const {
        contracts,
        empreses,
        persones,
        administradors,
        fraudes,
        concentracio,
        electoral,
        dependencia,
        stats,
        summary,
        casosInvestigacio,
        subvencions,
        loading,
        loadingProgress,
        investigacioLoaded,
        investigacioError,
        activeDataError,
        isDataTabLoading,
        canRenderDataTab,
        retryActiveData,
    } = useIguadataData(activeTab);
    const [homeIntroFading, setHomeIntroFading] = useState(false);
    const [threeReadyTick, setThreeReadyTick] = useState(0);
    const [showMobileScrollTop, setShowMobileScrollTop] = useState(false);
    const [isPageTop, setIsPageTop] = useState(() => window.scrollY < 24);
    const [homeRouteTransition, setHomeRouteTransition] = useState('');
    const [homeMetricTransition, setHomeMetricTransition] = useState(null);
    const homeIntroPlayedRef = useRef(false);
    const activeInvestigacioSlug = getCurrentRoute().startsWith('/investigacio/')
        ? getCurrentRoute().slice('/investigacio/'.length)
        : null;
    const activeInvestigacioCase = casosInvestigacio.find(item => item.slug === activeInvestigacioSlug)
        || CASOS_INVESTIGACIO_FALLBACK.find(item => item.slug === activeInvestigacioSlug)
        || null;
    const activeEntitatSlug = getCurrentRoute().startsWith('/entitats/')
        ? getCurrentRoute().slice('/entitats/'.length)
        : null;
    const activeEntitatSubvencions = useMemo(
        () => activeEntitatSlug ? subvencions.filter(subvencio => subvencio.entitat_slug === activeEntitatSlug) : [],
        [subvencions, activeEntitatSlug]
    );
    const preservedInvestigationContracts = useMemo(() =>
        casosInvestigacio.flatMap(caso =>
            (caso.content || []).flatMap(block => block.contract_snapshots || [])
        )
        , [casosInvestigacio]);

    useEffect(() => {
        if (activeTab !== 'home' || loading || homeIntroPlayedRef.current) return;
        homeIntroPlayedRef.current = true;
        setHomeIntroFading(true);
        const timer = setTimeout(() => setHomeIntroFading(false), 1150);
        return () => clearTimeout(timer);
    }, [activeTab, loading]);

    useEffect(() => {
        const lockScroll = loading;
        const hideScrollChrome = activeTab === 'home' && !loading;
        document.documentElement.classList.toggle('home-lock-scroll', lockScroll);
        document.body.classList.toggle('home-lock-scroll', lockScroll);
        document.documentElement.classList.toggle('home-scroll-surface', hideScrollChrome);
        document.body.classList.toggle('home-scroll-surface', hideScrollChrome);
        return () => {
            document.documentElement.classList.remove('home-lock-scroll');
            document.body.classList.remove('home-lock-scroll');
            document.documentElement.classList.remove('home-scroll-surface');
            document.body.classList.remove('home-scroll-surface');
        };
    }, [activeTab, loading]);

    useEffect(() => {
        if (activeTab !== 'home' || loading || !window.matchMedia('(max-width: 768px)').matches) return;
        let touchStartY = 0;

        const handleTouchStart = (event) => {
            touchStartY = event.touches[0]?.clientY || 0;
        };
        const handleTouchMove = (event) => {
            const currentY = event.touches[0]?.clientY || 0;
            if (window.scrollY <= 1 && currentY > touchStartY) {
                event.preventDefault();
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
        };
    }, [activeTab, loading]);

    useEffect(() => {
        if (!loading && activeTab !== 'home') return;
        const canvas = homeCanvasRef.current;
        if (!canvas) return;
        const homeNode = canvas.parentElement;
        if (!homeNode) return;
        const THREE = window.THREE;
        if (!THREE) {
            let cancelled = false;
            loadThree()
                .then(() => {
                    if (!cancelled) setThreeReadyTick(tick => tick + 1);
                })
                .catch(err => console.warn('No s\'ha pogut carregar Three.js:', err));
            return () => { cancelled = true; };
        }
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
        const useStaticParticles = reduceMotion;
        const usePointerInteraction = !reduceMotion && !isMobileViewport;
        const styles = getComputedStyle(document.documentElement);
        const particleColor = styles.getPropertyValue('--surface').trim();
        const navyColor = styles.getPropertyValue('--navy').trim();
        const clock = new THREE.Clock();
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
        const pointerTarget = new THREE.Vector4(0, 0, 0, 0.22);
        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: !isMobileViewport,
            antialias: false,
            powerPreference: isMobileViewport ? 'low-power' : 'high-performance',
        });
        const geometry = new THREE.BufferGeometry();
        const color = new THREE.Color(particleColor);
        camera.position.z = 7.5;
        renderer.setClearColor(isMobileViewport ? new THREE.Color(navyColor) : 0x000000, isMobileViewport ? 1 : 0);
        let frameId = null;
        let points = null;
        let particlesBuilt = false;
        let renderWidth = 0;
        let renderHeight = 0;

        const rand = (seed) => {
            const x = Math.sin(seed * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };

        const buildParticles = () => {
            if (particlesBuilt) return;
            const count = isMobileViewport ? 2600 : 12500;
            const positions = new Float32Array(count * 3);
            const seeds = new Float32Array(count * 4);
            const radius = isMobileViewport ? 3.35 : 4.35;
            for (let i = 0; i < count; i++) {
                const u = rand(i * 2.17) * Math.PI * 2;
                const v = Math.acos(2 * rand(i * 3.41) - 1);
                const shell = radius * Math.pow(rand(i * 4.63), 0.36);
                const ribbon = Math.sin(u * 3.0 + rand(i * 7.11) * 1.6) * 0.5;
                const x = Math.sin(v) * Math.cos(u) * shell;
                const y = Math.sin(v) * Math.sin(u) * shell * 0.72 + ribbon;
                const z = Math.cos(v) * shell;
                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;
                seeds[i * 4] = rand(i * 5.23);
                seeds[i * 4 + 1] = rand(i * 6.37);
                seeds[i * 4 + 2] = rand(i * 8.91);
                seeds[i * 4 + 3] = rand(i * 9.77);
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
            if (!points) {
                const material = new THREE.ShaderMaterial({
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    uniforms: {
                        uTime: { value: 0 },
                        uColor: { value: color },
                        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
                        uAspect: { value: 1 },
                        uPointer: { value: new THREE.Vector4(0, 0, 0, 0.22) },
                    },
                    vertexShader: `
                        attribute vec4 aSeed;
                        uniform float uTime;
                        uniform float uPixelRatio;
                        uniform float uAspect;
                        uniform vec4 uPointer;
                        varying float vAlpha;

                        void main() {
                            vec3 p = position;
                            float wave = sin(uTime * 0.42 + aSeed.x * 6.283 + p.y * 1.15) * 0.18;
                            float swirl = cos(uTime * 0.32 + aSeed.y * 6.283 + p.x * 1.4) * 0.15;
                            p.x += wave + sin(p.z * 1.8 + uTime * 0.22) * 0.08;
                            p.y += swirl;
                            p.z += sin(uTime * 0.28 + aSeed.z * 6.283 + p.x * 0.9) * 0.18;

                            vec4 mv = modelViewMatrix * vec4(p, 1.0);
                            vec4 projected = projectionMatrix * mv;
                            vec2 screen = projected.xy / projected.w;
                            vec2 toPointer = uPointer.xy - screen;
                            vec2 corrected = vec2(toPointer.x * uAspect, toPointer.y);
                            float dist = length(corrected);
                            float radius = max(uPointer.w, 0.001);
                            float influence = smoothstep(radius, 0.0, dist) * uPointer.z;
                            if (dist > 0.001 && uPointer.z > 0.001) {
                                vec2 direction = corrected / dist;
                                vec2 tangent = vec2(-direction.y, direction.x);
                                float metricField = smoothstep(1.12, 1.22, uPointer.z);
                                float core = smoothstep(radius * 0.34, 0.0, dist);
                                float ring = smoothstep(radius, radius * 0.38, dist) * (1.0 - core);
                                float pull = influence * (1.0 - core * 1.45);
                                float hollowPush = smoothstep(radius * 0.96, radius * 0.08, dist) * metricField;
                                vec2 field = direction * pull * 0.072 + tangent * ring * uPointer.z * 0.034;
                                field -= direction * hollowPush * 0.07;
                                projected.xy += vec2(field.x / uAspect, field.y) * projected.w;
                            }

                            gl_Position = projected;
                            gl_PointSize = (1.8 + aSeed.w * 1.8 + influence * 0.48) * uPixelRatio * (7.0 / -mv.z);
                            float metricField = smoothstep(1.12, 1.22, uPointer.z);
                            float hollowMask = mix(1.0, smoothstep(radius * 0.86, radius * 1.02, dist), metricField);
                            vAlpha = (0.12 + aSeed.z * 0.18 + influence * 0.07) * hollowMask;
                        }
                    `,
                    fragmentShader: `
                        uniform vec3 uColor;
                        varying float vAlpha;

                        void main() {
                            vec2 c = gl_PointCoord - vec2(0.5);
                            float d = length(c);
                            float circle = smoothstep(0.5, 0.18, d);
                            gl_FragColor = vec4(uColor, circle * vAlpha);
                        }
                    `,
                });
                points = new THREE.Points(geometry, material);
                points.rotation.x = -0.16;
                scene.add(points);
            }
            particlesBuilt = true;
        };

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const nextWidth = Math.round(rect.width);
            const nextHeight = Math.round(rect.height);
            if (isMobileViewport && renderWidth === nextWidth && renderHeight > 0) return;
            if (nextWidth === renderWidth && nextHeight === renderHeight) return;
            renderWidth = nextWidth;
            renderHeight = nextHeight;
            const dpr = isMobileViewport ? 1 : Math.min(window.devicePixelRatio || 1, 2);
            renderer.setPixelRatio(dpr);
            renderer.setSize(nextWidth, nextHeight, false);
            camera.aspect = nextWidth / Math.max(nextHeight, 1);
            camera.updateProjectionMatrix();
            buildParticles();
            if (points) {
                points.material.uniforms.uPixelRatio.value = dpr;
                points.material.uniforms.uAspect.value = camera.aspect;
            }
            if (useStaticParticles) renderer.render(scene, camera);
        };

        const render = () => {
            const elapsed = clock.getElapsedTime();
            if (points) {
                points.material.uniforms.uTime.value = useStaticParticles ? 0 : elapsed;
                points.material.uniforms.uPointer.value.lerp(pointerTarget, 0.14);
                points.rotation.y = elapsed * 0.045;
                points.rotation.z = Math.sin(elapsed * 0.13) * 0.08;
            }
            renderer.render(scene, camera);
            if (!useStaticParticles) frameId = requestAnimationFrame(render);
        };

        const setPointerField = (clientX, clientY, strength = 1, radius = 0.22) => {
            const rect = canvas.getBoundingClientRect();
            pointerTarget.set(
                ((clientX - rect.left) / rect.width) * 2 - 1,
                -(((clientY - rect.top) / rect.height) * 2 - 1),
                strength,
                radius
            );
        };

        const handlePointerMove = (event) => {
            const metricNode = event.target.closest?.('.home-metric');
            if (metricNode && homeNode.contains(metricNode)) {
                const metricRect = metricNode.getBoundingClientRect();
                setPointerField(metricRect.left + metricRect.width / 2, metricRect.top + metricRect.height / 2, 1.25, 0.31);
            } else {
                setPointerField(event.clientX, event.clientY, 1, 0.22);
            }
            if (reduceMotion) render();
        };
        const handlePointerLeave = () => {
            pointerTarget.z = 0;
            if (reduceMotion) render();
        };

        resize();
        render();
        window.addEventListener('resize', resize);
        if (usePointerInteraction) {
            homeNode.addEventListener('pointermove', handlePointerMove);
            homeNode.addEventListener('pointerleave', handlePointerLeave);
        }

        return () => {
            window.removeEventListener('resize', resize);
            if (usePointerInteraction) {
                homeNode.removeEventListener('pointermove', handlePointerMove);
                homeNode.removeEventListener('pointerleave', handlePointerLeave);
            }
            if (frameId) cancelAnimationFrame(frameId);
            if (points) {
                scene.remove(points);
                points.geometry.dispose();
                points.material.dispose();
            }
            geometry.dispose();
            renderer.dispose();
        };
    }, [activeTab, loading, threeReadyTick]);

    useEffect(() => {
        const updateScrollTopButton = () => {
            setIsPageTop(window.scrollY < 24);
            setShowMobileScrollTop(activeTab !== 'home' && window.matchMedia('(max-width: 768px)').matches && window.scrollY > 180);
        };
        updateScrollTopButton();
        window.addEventListener('scroll', updateScrollTopButton, { passive: true });
        window.addEventListener('resize', updateScrollTopButton);
        return () => {
            window.removeEventListener('scroll', updateScrollTopButton);
            window.removeEventListener('resize', updateScrollTopButton);
        };
    }, [activeTab]);

    const [expandedId, setExpandedId] = useState(null);
    const [expandedMonopolyId, setExpandedMonopolyId] = useState(null);
    const [searchTerm, setSearchTerm] = useState(initialContractSearch.searchTerm);
    const [debouncedSearch, setDebouncedSearch] = useState(initialContractSearch.searchTerm);
    const [typeFilter, setTypeFilter] = useState(initialContractSearch.typeFilter);
    const [procedureFilter, setProcedureFilter] = useState(initialContractSearch.procedureFilter);
    const [analisiTab, setAnalisiTab] = useState(initialAnalysisSearch.tab);
    const [analisiFiltersByTab, setAnalisiFiltersByTab] = useState(() => {
        const defaults = () => ({ searchTerm: '', sortBy: 'risk-desc' });
        const state = {
            fraccionament: defaults(),
            monopoli: defaults(),
            electoral: defaults(),
            dependencia: defaults(),
        };
        state[initialAnalysisSearch.tab] = {
            searchTerm: initialAnalysisSearch.searchTerm,
            sortBy: initialAnalysisSearch.sortBy,
        };
        return state;
    });
    const currentAnalisiFilters = analisiFiltersByTab[analisiTab];
    const analisiSearch = currentAnalisiFilters.searchTerm;
    const analisiSort = currentAnalisiFilters.sortBy;
    const setAnalisiFilterValue = (key, value) => {
        setAnalisiFiltersByTab(previous => ({
            ...previous,
            [analisiTab]: { ...previous[analisiTab], [key]: value },
        }));
        if (analisiTab === 'fraccionament') setAnalisiPageFrac(1);
        if (analisiTab === 'monopoli') setAnalisiPageMonop(1);
        if (analisiTab === 'electoral') setAnalisiPageElect(1);
        if (analisiTab === 'dependencia') setAnalisiPageDependencia(1);
    };
    const setAnalisiSearch = value => setAnalisiFilterValue('searchTerm', value);
    const setAnalisiSort = value => setAnalisiFilterValue('sortBy', value);
    const [concentracioMode, setConcentracioMode] = useState(initialAnalysisSearch.concentrationMode);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [analisiFiltersOpen, setAnalisiFiltersOpen] = useState(false);
    const [analisiPageFrac, setAnalisiPageFrac] = useState(initialAnalysisSearch.tab === 'fraccionament' ? initialAnalysisSearch.currentPage : 1);
    const [analisiPageElect, setAnalisiPageElect] = useState(initialAnalysisSearch.tab === 'electoral' ? initialAnalysisSearch.currentPage : 1);
    const [analisiPageMonop, setAnalisiPageMonop] = useState(initialAnalysisSearch.tab === 'monopoli' ? initialAnalysisSearch.currentPage : 1);
    const [analisiPageDependencia, setAnalisiPageDependencia] = useState(initialAnalysisSearch.tab === 'dependencia' ? initialAnalysisSearch.currentPage : 1);
    const analisiItemsPerPage = 25;
    useEffect(() => {
        setAnalisiFiltersOpen(false);
    }, [analisiTab, concentracioMode]);
    const [dateStart, setDateStart] = useState(initialContractSearch.dateStart);
    const [dateEnd, setDateEnd] = useState(initialContractSearch.dateEnd);
    const [amountMin, setAmountMin] = useState(initialContractSearch.amountMin);
    const [amountMax, setAmountMax] = useState(initialContractSearch.amountMax);
    const [sortBy, setSortBy] = useState(initialContractSearch.sortBy);
    const [currentPage, setCurrentPage] = useState(initialContractSearch.currentPage);
    const itemsPerPage = 25;
    const [selectedCasoDetail, setSelectedCasoDetail] = useState(null);
    const [selectedConcentracioDetail, setSelectedConcentracioDetail] = useState(null);
    const [selectedElectoralismeDetail, setSelectedElectoralismeDetail] = useState(null);
    const [selectedDependenciaDetail, setSelectedDependenciaDetail] = useState(null);
    const [pendingCasId, setPendingCasId] = useState(() => {
        const p = getCurrentRoute();
        return p.startsWith('/analisi/fraccionament/') ? p.slice('/analisi/fraccionament/'.length) : null;
    });
    const [pendingConcentracioId, setPendingConcentracioId] = useState(() => {
        const p = getCurrentRoute();
        return p.startsWith('/analisi/concentracio/') ? p.slice('/analisi/concentracio/'.length) : null;
    });
    const [pendingElectoralismeId, setPendingElectoralismeId] = useState(() => {
        const p = getCurrentRoute();
        return p.startsWith('/analisi/electoralisme/') ? p.slice('/analisi/electoralisme/'.length) : null;
    });
    const [pendingDependenciaId, setPendingDependenciaId] = useState(() => {
        const p = getCurrentRoute();
        return p.startsWith('/analisi/dependencia/') ? p.slice('/analisi/dependencia/'.length) : null;
    });
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAnalisiMobileMenuOpen, setIsAnalisiMobileMenuOpen] = useState(false);
    useEffect(() => {
        document.documentElement.classList.toggle('mobile-menu-lock', isMobileMenuOpen);
        document.body.classList.toggle('mobile-menu-lock', isMobileMenuOpen);
        return () => {
            document.documentElement.classList.remove('mobile-menu-lock');
            document.body.classList.remove('mobile-menu-lock');
        };
    }, [isMobileMenuOpen]);
    const [sourceTabForCompany, setSourceTabForCompany] = useState('empreses');
    const restoreScrollRef = useRef(null);
    const pendingScrollTopRef = useRef(false);
    const homeCanvasRef = useRef(null);

    // Empreses filter state (lifted so it persists across navigation)
    const [empresesSearch, setEmpresesSearch] = useState('');
    const [empresesSector, setEmpresesSector] = useState('');
    const [empresesCategoria, setEmpresesCategoria] = useState('');
    const [empresesSort, setEmpresesSort] = useState('amount-desc');
    const [empresesPage, setEmpresesPage] = useState(1);

    // Persones filter state (lifted so it persists across navigation)
    const [personesSearch, setPersonesSearch] = useState('');
    const [personesSort, setPersonesSort] = useState('companies-desc');
    const [personesPage, setPersonesPage] = useState(1);
    const [personesExpanded, setPersonesExpanded] = useState(null);
    const applyContractSearchState = (state = readContractSearchState()) => {
        setSearchTerm(state.searchTerm);
        setDebouncedSearch(state.searchTerm);
        setTypeFilter(state.typeFilter);
        setProcedureFilter(state.procedureFilter);
        setDateStart(state.dateStart);
        setDateEnd(state.dateEnd);
        setAmountMin(state.amountMin);
        setAmountMax(state.amountMax);
        setSortBy(state.sortBy);
        setCurrentPage(state.currentPage);
    };
    const applyAnalysisSearchState = (state = readAnalysisSearchState()) => {
        setAnalisiTab(state.tab);
        setConcentracioMode(state.concentrationMode);
        setAnalisiFiltersByTab(previous => ({
            ...previous,
            [state.tab]: {
                searchTerm: state.searchTerm,
                sortBy: state.sortBy,
            },
        }));
        if (state.tab === 'fraccionament') setAnalisiPageFrac(state.currentPage);
        if (state.tab === 'monopoli') setAnalisiPageMonop(state.currentPage);
        if (state.tab === 'electoral') setAnalisiPageElect(state.currentPage);
        if (state.tab === 'dependencia') setAnalisiPageDependencia(state.currentPage);
    };
    const resetAllFilters = () => {
        // Contractes
        setSearchTerm(''); setDebouncedSearch('');
        setTypeFilter(''); setProcedureFilter('');
        setDateStart(''); setDateEnd('');
        setAmountMin(''); setAmountMax('');
        setSortBy('date-desc'); setCurrentPage(1);
        // Empreses
        setEmpresesSearch(''); setEmpresesSector('');
        setEmpresesCategoria(''); setEmpresesSort('amount-desc');
        setEmpresesPage(1);
        // Persones
        setPersonesSearch(''); setPersonesSort('companies-desc');
        setPersonesPage(1); setPersonesExpanded(null);
    };

    // --- Enrutamiento SPA (pathname routing, sense hash) ---
    const scrollKey = (href = window.location.href) => `iguadata-scroll:${href}`;

    const saveScrollPosition = (href = window.location.href, y = window.scrollY) => {
        try {
            window.sessionStorage.setItem(scrollKey(href), String(y));
        } catch (_) { }
    };

    const getSavedScrollPosition = (href = window.location.href, fallback = 0) => {
        try {
            const stored = window.sessionStorage.getItem(scrollKey(href));
            return stored !== null ? Number(stored) : fallback;
        } catch (_) {
            return fallback;
        }
    };

    const saveCurrentScroll = () => {
        const state = window.history.state || {};
        saveScrollPosition();
        window.history.replaceState({
            ...state,
            iguadata: true,
            scrollY: window.scrollY
        }, '', window.location.href);
    };

    const scheduleScrollTop = () => {
        pendingScrollTopRef.current = true;
        const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        requestAnimationFrame(() => {
            scrollTop();
            requestAnimationFrame(scrollTop);
        });
        window.setTimeout(scrollTop, 80);
    };

    const handleNavigation = (tab, customPath = null, { keepFilters = false, replace = false } = {}) => {
        if (!keepFilters && tab !== 'empresa') resetAllFilters();
        setActiveTab(tab);
        const pathMap = {
            'home': '/',
            'buscador': '/contractes',
            'contracte': '/contractes',
            'empreses': '/empreses',
            'empresa': '/empreses', // Fallback si no es passa customPath
            'persones': '/persones',
            'subvencions': '/subvencions',
            'entitat': '/subvencions',
            'analisi': '/analisi',
            'cas-fraccionament': '/analisi/fraccionament',
            'cas-concentracio': '/analisi/concentracio',
            'cas-investigacio': '/investigacio/passeig-verdaguer',
            'casos': '/investigacio',
            'sobre': '/sobre',
            'legal': '/avis-legal'
        };
        const route = customPath !== null ? customPath : (pathMap[tab] || '/');
        const normalizedRoute = (route.length > 1 && route.endsWith('/')) ? route.slice(0, -1) : route;
        const fullPath = (BASE + normalizedRoute).replace(/\/+$/, '') || '/';
        if (getCurrentRoute() !== normalizedRoute) {
            if (!replace) saveCurrentScroll();
            window.history[replace ? 'replaceState' : 'pushState']({
                tab,
                iguadata: true,
                scrollY: 0
            }, '', fullPath);
            saveScrollPosition(new URL(fullPath, window.location.origin).href, 0);
        }
        scheduleScrollTop();
    };

    useEffect(() => {
        if (activeTab !== 'cas-investigacio' || !investigacioLoaded || investigacioError || activeInvestigacioCase) return;
        handleNavigation('casos', '/investigacio', { replace: true });
    }, [activeTab, investigacioLoaded, investigacioError, activeInvestigacioCase]);

    useEffect(() => {
        if (activeTab !== 'entitat' || !subvencions.length || activeEntitatSubvencions.length) return;
        handleNavigation('subvencions', '/subvencions', { replace: true });
    }, [activeTab, subvencions, activeEntitatSubvencions]);

    const runRouteTransition = useCallback((navigate) => {
        if (homeRouteTransition) return;
        setHomeRouteTransition('is-entering');
        window.setTimeout(() => {
            navigate();
            window.setTimeout(() => setHomeRouteTransition('is-leaving'), 120);
            window.setTimeout(() => setHomeRouteTransition(''), 880);
        }, 360);
    }, [homeRouteTransition]);

    const handleTransitionLinkClick = (event, navigate) => {
        if (!isPlainLeftClick(event)) return;
        event.preventDefault();
        runRouteTransition(navigate);
    };

    const handleHomeMetricLinkClick = (event, navigate) => {
        if (!isPlainLeftClick(event)) return;
        event.preventDefault();
        if (homeRouteTransition || homeMetricTransition) return;
        const rect = event.currentTarget.getBoundingClientRect();
        setHomeMetricTransition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            phase: 'is-expanding'
        });
        window.setTimeout(() => {
            navigate();
            setHomeMetricTransition(current => current ? { ...current, phase: 'is-revealing' } : current);
            window.setTimeout(() => setHomeMetricTransition(null), 760);
        }, 440);
    };

    useEffect(() => {
        window.history.scrollRestoration = 'manual';
        if (!window.history.state?.iguadata) {
            window.history.replaceState({
                ...(window.history.state || {}),
                iguadata: true,
                scrollY: window.scrollY
            }, '', window.location.href);
        }
        const handlePopState = (event) => {
            const state = event.state || window.history.state || {};
            const fallbackScroll = typeof state.scrollY === 'number' ? state.scrollY : 0;
            restoreScrollRef.current = getSavedScrollPosition(window.location.href, fallbackScroll);
            const p = getCurrentRoute();
            const resolved = resolveRoute(p);
            if (resolved.canonicalPath !== p) {
                handleNavigation(resolved.tab, resolved.canonicalPath, { replace: true });
                setSelectedEmpresa(null);
                setSelectedContractForDetail(null);
                return;
            }
            if (p.startsWith('/empreses/')) {
                setPendingEmpresaSlug(p.slice('/empreses/'.length));
                setSelectedEmpresa(null);
                setActiveTab('empresa');
            }
            else if (p.startsWith('/entitats/')) {
                setActiveTab('entitat');
            }
            else if (p.startsWith('/contractes/')) {
                setPendingContractSlug(p.slice('/contractes/'.length));
                setSelectedContractForDetail(null);
                setActiveTab('contracte');
            }
            else if (p.startsWith('/analisi/fraccionament/')) {
                setPendingCasId(p.slice('/analisi/fraccionament/'.length));
                setSelectedCasoDetail(null);
                setActiveTab('cas-fraccionament');
            }
            else if (p.startsWith('/analisi/concentracio/')) {
                setPendingConcentracioId(p.slice('/analisi/concentracio/'.length));
                setSelectedConcentracioDetail(null);
                setActiveTab('cas-concentracio');
            }
            else if (p.startsWith('/analisi/electoralisme/')) {
                setPendingElectoralismeId(p.slice('/analisi/electoralisme/'.length));
                setSelectedElectoralismeDetail(null);
                setActiveTab('cas-electoralisme');
            }
            else if (p.startsWith('/analisi/dependencia/')) {
                setPendingDependenciaId(p.slice('/analisi/dependencia/'.length));
                setSelectedDependenciaDetail(null);
                setActiveTab('cas-dependencia');
            }
            else {
                const tab = resolved.tab;
                if (tab === 'empreses') setSelectedEmpresa(null);
                if (tab === 'buscador') {
                    applyContractSearchState();
                    setSelectedContractForDetail(null);
                }
                if (tab === 'analisi') applyAnalysisSearchState();
                setActiveTab(tab);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        let ticking = false;
        const persistScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                saveScrollPosition();
            });
        };
        window.addEventListener('scroll', persistScroll, { passive: true });
        return () => window.removeEventListener('scroll', persistScroll);
    }, []);

    useEffect(() => {
        if (restoreScrollRef.current === null) return;
        if (activeTab === 'contracte' && !selectedContractForDetail) return;
        if (activeTab === 'empresa' && !selectedEmpresa) return;
        if (activeTab === 'cas-fraccionament' && !selectedCasoDetail) return;
        if (activeTab === 'cas-concentracio' && !selectedConcentracioDetail) return;
        if (activeTab === 'cas-electoralisme' && !selectedElectoralismeDetail) return;
        if (activeTab === 'cas-dependencia' && !selectedDependenciaDetail) return;
        const y = restoreScrollRef.current;
        restoreScrollRef.current = null;
        requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'auto' }));
    }, [activeTab, selectedContractForDetail, selectedEmpresa, selectedCasoDetail, selectedConcentracioDetail, selectedElectoralismeDetail, selectedDependenciaDetail]);

    useEffect(() => {
        if (!pendingScrollTopRef.current || restoreScrollRef.current !== null) return;
        if (activeTab === 'contracte' && !selectedContractForDetail) return;
        if (activeTab === 'empresa' && !selectedEmpresa) return;
        if (activeTab === 'cas-fraccionament' && !selectedCasoDetail) return;
        if (activeTab === 'cas-concentracio' && !selectedConcentracioDetail) return;
        if (activeTab === 'cas-electoralisme' && !selectedElectoralismeDetail) return;
        if (activeTab === 'cas-dependencia' && !selectedDependenciaDetail) return;
        pendingScrollTopRef.current = false;

        const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        scrollTop();
        requestAnimationFrame(() => {
            scrollTop();
            requestAnimationFrame(scrollTop);
        });
        window.setTimeout(scrollTop, 80);
    }, [activeTab, selectedContractForDetail, selectedEmpresa, selectedCasoDetail, selectedConcentracioDetail, selectedElectoralismeDetail, selectedDependenciaDetail]);
    // ---------------------------------------------

    // Debounce de la cerca
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const contractCount = useCountUp(stats?.total_contratos || 0, 2000, !loading && stats);
    const subvencionsCount = useCountUp(summary?.stats?.num_subvencions || 0, 2000, !loading && stats);
    const empresasCount = useCountUp(stats?.num_empresas || 0, 2000, !loading && stats);
    const personesMetricTotal = persones.length || summary?.stats?.num_persones || 0;
    const personesCount = useCountUp(personesMetricTotal, 2000, !loading && stats);
    const alertesVisibleTotal = useMemo(() =>
        fraudes.filter(f => f.nivell !== 'BAIX').length +
        concentracio.length +
        electoral.filter(f => f.nivell !== 'BAIX').length +
        dependencia.filter(f => f.nivell !== 'BAIX').length
        , [fraudes, concentracio, electoral, dependencia]);
    const alertesMetricTotal = alertesVisibleTotal || summary?.stats?.num_alertes || 0;
    const alertesCount = useCountUp(alertesMetricTotal, 2000, !loading && stats);
    const homeRiskCounts = useMemo(() => {
        if (!fraudes.length && !concentracio.length && !electoral.length && !dependencia.length && summary?.home?.risk_counts) {
            return summary.home.risk_counts;
        }
        const levels = [...fraudes, ...concentracio, ...electoral, ...dependencia]
            .map(item => String(item.nivell || '').toUpperCase());

        return {
            alt: levels.filter(level => level === 'CRITIC').length,
            mitja: levels.filter(level => level === 'ALT').length,
            baix: levels.filter(level => level === 'OBSERVACIO' || level === 'BAIX').length,
        };
    }, [fraudes, concentracio, electoral, dependencia, summary]);

    useEffect(() => {
        const route = getCurrentRoute();
        const resolved = resolveRoute(route);
        if (resolved.canonicalPath !== route) {
            handleNavigation(resolved.tab, resolved.canonicalPath, { replace: true });
        }
    }, []);

    // Handle deep linking to a contract once the data loads
    useEffect(() => {
        if (contracts.length > 0 && pendingContractSlug) {
            const evidencePrefix = 'evidencia/';
            const isEvidenceRoute = pendingContractSlug.startsWith(evidencePrefix);
            if (isEvidenceRoute && !investigacioLoaded && !investigacioError) return;
            const requestedSlug = isEvidenceRoute ? pendingContractSlug.slice(evidencePrefix.length) : pendingContractSlug;
            const c = isEvidenceRoute
                ? preservedInvestigationContracts.find(contract => contract.slug === requestedSlug)
                : contracts.find(contract => contractMatchesSlug(contract, requestedSlug));
            if (c) {
                setSelectedContractForDetail(c);
                const canonicalPath = isEvidenceRoute
                    ? `/contractes/evidencia/${c.slug}`
                    : `/contractes/${c.slug}`;
                if (c.slug !== requestedSlug) {
                    handleNavigation('contracte', canonicalPath, { replace: true });
                }
            } else {
                handleNavigation('buscador', null, { replace: true });
            }
            setPendingContractSlug(null);
        }
    }, [contracts, pendingContractSlug, preservedInvestigationContracts, investigacioLoaded, investigacioError]);

    // Handle deep linking to an empresa once the data loads
    useEffect(() => {
        if (empreses.length > 0 && pendingEmpresaSlug) {
            const emp = empreses.find(e => empresaMatchesSlug(e, pendingEmpresaSlug));
            if (emp) {
                setSelectedEmpresa(emp.nom);
                if (emp.slug !== pendingEmpresaSlug) {
                    handleNavigation('empresa', `/empreses/${emp.slug}`, { replace: true });
                }
            } else {
                handleNavigation('empreses', null, { replace: true });
            }
            setPendingEmpresaSlug(null);
        }
    }, [empreses, pendingEmpresaSlug]);

    // Handle deep linking to a fraccionament case once data loads
    useEffect(() => {
        if (fraudes.length > 0 && pendingCasId) {
            const cas = fraudes.find(f => String(f.id) === String(pendingCasId));
            if (cas) {
                setSelectedCasoDetail(cas);
                setAnalisiTab('fraccionament');
            } else {
                handleNavigation('analisi', '/analisi', { replace: true });
            }
            setPendingCasId(null);
        }
    }, [fraudes, pendingCasId]);

    useEffect(() => {
        if (concentracio.length > 0 && pendingConcentracioId) {
            const cas = concentracio.find(f => String(f.id) === String(pendingConcentracioId));
            if (cas) {
                setSelectedConcentracioDetail(cas);
                setAnalisiTab('monopoli');
            } else {
                handleNavigation('analisi', '/analisi', { replace: true });
            }
            setPendingConcentracioId(null);
        }
    }, [concentracio, pendingConcentracioId]);

    useEffect(() => {
        if (electoral.length > 0 && pendingElectoralismeId) {
            const cas = electoral.find(f => String(f.id) === String(pendingElectoralismeId));
            if (cas) {
                setSelectedElectoralismeDetail(cas);
                setAnalisiTab('electoral');
            } else {
                handleNavigation('analisi', '/analisi', { replace: true });
            }
            setPendingElectoralismeId(null);
        }
    }, [electoral, pendingElectoralismeId]);

    useEffect(() => {
        if (dependencia.length > 0 && pendingDependenciaId) {
            const cas = dependencia.find(item => String(item.id) === String(pendingDependenciaId));
            if (cas) {
                setSelectedDependenciaDetail(cas);
                setAnalisiTab('dependencia');
            } else {
                handleNavigation('analisi', '/analisi', { replace: true });
            }
            setPendingDependenciaId(null);
        }
    }, [dependencia, pendingDependenciaId]);

    useEffect(() => {
        if (activeTab === 'contracte' && selectedContractForDetail) {
            document.title = formatPageTitle(selectedContractForDetail.descripcion);
            return;
        }
        if (activeTab === 'empresa' && selectedEmpresa) {
            document.title = formatPageTitle(selectedEmpresa);
            return;
        }
        if (activeTab === 'entitat' && activeEntitatSubvencions.length) {
            document.title = formatPageTitle(activeEntitatSubvencions[0].adjudicatario);
            return;
        }
        if (activeTab === 'cas-fraccionament' && selectedCasoDetail) {
            document.title = formatPageTitle(`Cas #${selectedCasoDetail.id}`);
            return;
        }
        if (activeTab === 'cas-concentracio' && selectedConcentracioDetail) {
            document.title = formatPageTitle(`Cas #${selectedConcentracioDetail.id}`);
            return;
        }
        if (activeTab === 'cas-electoralisme' && selectedElectoralismeDetail) {
            document.title = formatPageTitle(`Cas #${selectedElectoralismeDetail.id}`);
            return;
        }
        if (activeTab === 'cas-investigacio') {
            document.title = formatPageTitle(activeInvestigacioCase?.title || 'Investigació');
            return;
        }
        if (activeTab === 'cas-dependencia' && selectedDependenciaDetail) {
            document.title = formatPageTitle(`Cas #${selectedDependenciaDetail.id}`);
            return;
        }
        const titles = {
            'home': `${BRAND_NAME} | ${BRAND_TAGLINE}`,
            'loading': BRAND_NAME,
            buscador: formatPageTitle('Contractes'),
            empreses: formatPageTitle('Empreses'),
            persones: formatPageTitle('Persones'),
            subvencions: formatPageTitle('Subvencions'),
            entitat: formatPageTitle('Subvencions'),
            analisi: formatPageTitle('Anàlisi'),
            casos: formatPageTitle("Casos d'investigació"),
            sobre: formatPageTitle('Sobre'),
            legal: BRAND_NAME
        };
        document.title = titles[activeTab] || BRAND_NAME;
    }, [activeTab, selectedContractForDetail, selectedEmpresa, selectedCasoDetail, selectedConcentracioDetail, selectedElectoralismeDetail, selectedDependenciaDetail, activeInvestigacioCase, activeEntitatSubvencions]);

    const contractesFiltrats = useMemo(() => {
        let result = [...contracts];

        if (debouncedSearch) {
            result = filterContractsBySearch(
                result,
                debouncedSearch,
                c => [c.descripcion, c.adjudicatario, c.codigo]
            );
        }

        if (typeFilter) {
            if (typeFilter === '5. SERVEIS') {
                result = result.filter(c => c.tipo === '5. SERVEIS' || c.tipo === 'SERVEIS');
            } else {
                result = result.filter(c => c.tipo === typeFilter);
            }
        }

        if (procedureFilter) result = result.filter(c => c.procedimiento === procedureFilter);

        if (dateStart) {
            result = result.filter(c => new Date(c.fecha) >= new Date(dateStart));
        }

        if (dateEnd) {
            result = result.filter(c => new Date(c.fecha) <= new Date(dateEnd));
        }
        if (amountMin !== '') {
            result = result.filter(c => Number(c.importe) >= Number(amountMin));
        }
        if (amountMax !== '') {
            result = result.filter(c => Number(c.importe) <= Number(amountMax));
        }

        switch (sortBy) {
            case 'date-desc':
                result.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                break;
            case 'date-asc':
                result.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                break;
            case 'amount-desc':
                result.sort((a, b) => b.importe - a.importe);
                break;
            case 'amount-asc':
                result.sort((a, b) => a.importe - b.importe);
                break;
            default:
                result.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        }

        return result;
    }, [contracts, debouncedSearch, typeFilter, procedureFilter, dateStart, dateEnd, amountMin, amountMax, sortBy]);

    const totalPages = Math.ceil(contractesFiltrats.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const contractesPaginats = contractesFiltrats.slice(startIndex, endIndex);

    useEffect(() => {
        if (!contracts.length) return;
        const lastPage = Math.max(1, totalPages);
        if (currentPage > lastPage) setCurrentPage(lastPage);
    }, [contracts.length, currentPage, totalPages]);

    useEffect(() => {
        if (activeTab !== 'buscador' || getCurrentRoute() !== '/contractes') return;
        const query = buildContractSearchParams({
            searchTerm,
            typeFilter,
            procedureFilter,
            dateStart,
            dateEnd,
            amountMin,
            amountMax,
            sortBy,
            currentPage,
        });
        const fullPath = `${BASE}/contractes${query ? `?${query}` : ''}`;
        const nextHref = new URL(fullPath, window.location.origin).href;
        if (nextHref === window.location.href) return;
        const scrollY = window.scrollY;
        window.history.replaceState({
            ...(window.history.state || {}),
            tab: 'buscador',
            iguadata: true,
            scrollY,
        }, '', fullPath);
        saveScrollPosition(nextHref, scrollY);
    }, [activeTab, searchTerm, typeFilter, procedureFilter, dateStart, dateEnd, amountMin, amountMax, sortBy, currentPage]);

    useEffect(() => {
        if (activeTab !== 'analisi' || getCurrentRoute() !== '/analisi') return;
        const currentPage = analisiTab === 'fraccionament'
            ? analisiPageFrac
            : analisiTab === 'monopoli'
                ? analisiPageMonop
                : analisiTab === 'electoral'
                    ? analisiPageElect
                    : analisiPageDependencia;
        const query = buildAnalysisSearchParams({
            tab: analisiTab,
            concentrationMode: concentracioMode,
            searchTerm: analisiSearch,
            sortBy: analisiSort,
            currentPage,
        });
        const fullPath = `${BASE}/analisi${query ? `?${query}` : ''}`;
        const nextHref = new URL(fullPath, window.location.origin).href;
        if (nextHref === window.location.href) return;
        const scrollY = window.scrollY;
        window.history.replaceState({
            ...(window.history.state || {}),
            tab: 'analisi',
            iguadata: true,
            scrollY,
        }, '', fullPath);
        saveScrollPosition(nextHref, scrollY);
    }, [activeTab, analisiTab, concentracioMode, analisiSearch, analisiSort, analisiPageFrac, analisiPageMonop, analisiPageElect, analisiPageDependencia]);

    const fraudesFiltrats = useMemo(() => {
        let result = fraudes.filter(f => f.nivell !== 'BAIX');
        if (analisiSearch.trim()) {
            result = result.filter(f => matchesSearchQuery(
                [
                    ...(f.empreses || []),
                    f.id,
                    ...(f.contractes || []).flatMap(c => [c.descripcion, c.adjudicatario])
                ],
                analisiSearch
            ));
        }
        result = [...result];
        switch (analisiSort) {
            case 'risk-asc':
                result.sort((a, b) => (a.risc || 0) - (b.risc || 0));
                break;
            case 'amount-desc':
                result.sort((a, b) => (b.import_total || 0) - (a.import_total || 0));
                break;
            case 'amount-asc':
                result.sort((a, b) => (a.import_total || 0) - (b.import_total || 0));
                break;
            case 'date-desc':
                result.sort((a, b) => new Date(b.data_fi || b.data_inici) - new Date(a.data_fi || a.data_inici));
                break;
            case 'date-asc':
                result.sort((a, b) => new Date(a.data_inici || a.data_fi) - new Date(b.data_inici || b.data_fi));
                break;
            default:
                result.sort((a, b) => (b.risc || 0) - (a.risc || 0));
        }
        return result;
    }, [fraudes, analisiSearch, analisiSort]);

    const concentracioFiltradaBase = useMemo(() => [...concentracio], [concentracio]);

    const concentracioTemporalBase = useMemo(() => {
        let result = [...concentracio];
        if (analisiSearch.trim()) {
            result = result.filter(f => matchesSearchQuery(
                [
                    f.id,
                    ...(f.empreses || []),
                    ...(f.contractes || []).flatMap(c => [c.descripcion, c.adjudicatario])
                ],
                analisiSearch
            ));
        }
        return result;
    }, [concentracio, analisiSearch]);

    const orderConcentracio = useCallback((items) => {
        const result = [...items];
        switch (analisiSort) {
            case 'risk-asc':
                result.sort((a, b) => (a.risc || 0) - (b.risc || 0));
                break;
            case 'amount-desc':
                result.sort((a, b) => (b.import_concentrat || 0) - (a.import_concentrat || 0));
                break;
            case 'amount-asc':
                result.sort((a, b) => (a.import_concentrat || 0) - (b.import_concentrat || 0));
                break;
            case 'date-desc':
                result.sort((a, b) => new Date(b.data_fi || b.data_inici) - new Date(a.data_fi || a.data_inici));
                break;
            case 'date-asc':
                result.sort((a, b) => new Date(a.data_inici || a.data_fi) - new Date(b.data_inici || b.data_fi));
                break;
            default:
                result.sort((a, b) => (b.risc || 0) - (a.risc || 0));
        }
        return result;
    }, [analisiSort]);

    const bestConcentracioBySector = useCallback((items) => {
        const isBetterRepresentative = (candidate, current) => {
            if (!current) return true;
            const candidateScore = [candidate.risc || 0, candidate.quota_import || 0, candidate.import_concentrat || 0];
            const currentScore = [current.risc || 0, current.quota_import || 0, current.import_concentrat || 0];
            for (let i = 0; i < candidateScore.length; i += 1) {
                if (candidateScore[i] !== currentScore[i]) return candidateScore[i] > currentScore[i];
            }
            return false;
        };
        const bySector = new Map();
        items.forEach(caso => {
            const key = caso.sector || 'Altres Serveis i Subministraments';
            const current = bySector.get(key);
            if (isBetterRepresentative(caso, current)) bySector.set(key, caso);
        });
        return [...bySector.values()];
    }, []);

    const concentracioHistoric = useMemo(() => {
        const filtered = concentracioFiltradaBase.filter(f => f.finestra === 'historic');
        return bestConcentracioBySector(filtered)
            .sort((a, b) => (b.quota_import || 0) - (a.quota_import || 0));
    }, [bestConcentracioBySector, concentracioFiltradaBase]);

    const concentracioTemporal = useMemo(() => {
        let result = concentracioTemporalBase.filter(f => f.finestra !== 'historic');
        return orderConcentracio(result);
    }, [concentracioTemporalBase, orderConcentracio]);

    const electoralFiltrats = useMemo(() => {
        let result = electoral.filter(f => f.nivell !== 'BAIX');
        if (analisiSearch.trim()) {
            result = result.filter(f => matchesSearchQuery(
                [
                    f.empresa,
                    f.id,
                    ...(f.contractes || []).flatMap(c => [c.descripcion, c.adjudicatario])
                ],
                analisiSearch
            ));
        }
        result = [...result];
        switch (analisiSort) {
            case 'risk-asc':
                result.sort((a, b) => (a.risc || 0) - (b.risc || 0));
                break;
            case 'amount-desc':
                result.sort((a, b) => (b.import_total || 0) - (a.import_total || 0));
                break;
            case 'amount-asc':
                result.sort((a, b) => (a.import_total || 0) - (b.import_total || 0));
                break;
            case 'date-desc':
                result.sort((a, b) => new Date(b.data_fi || b.data_inici) - new Date(a.data_fi || a.data_inici));
                break;
            case 'date-asc':
                result.sort((a, b) => new Date(a.data_inici || a.data_fi) - new Date(b.data_inici || b.data_fi));
                break;
            default:
                result.sort((a, b) => (b.risc || 0) - (a.risc || 0));
        }
        return result;
    }, [electoral, analisiSearch, analisiSort]);

    const dependenciaFiltrada = useMemo(() => {
        let result = dependencia.filter(item => item.nivell !== 'BAIX');
        if (analisiSearch.trim()) {
            result = result.filter(item => matchesSearchQuery(
                [item.entitat, item.cif, item.id, ...(item.motius || []), ...(item.subvencions || []).map(row => row.descripcion)],
                analisiSearch
            ));
        }
        result = [...result];
        switch (analisiSort) {
            case 'risk-asc': result.sort((a, b) => a.risc - b.risc); break;
            case 'amount-desc': result.sort((a, b) => b.import_total - a.import_total); break;
            case 'amount-asc': result.sort((a, b) => a.import_total - b.import_total); break;
            case 'date-desc': result.sort((a, b) => new Date(b.data_fi) - new Date(a.data_fi)); break;
            case 'date-asc': result.sort((a, b) => new Date(a.data_inici) - new Date(b.data_inici)); break;
            default: result.sort((a, b) => b.risc - a.risc);
        }
        return result;
    }, [dependencia, analisiSearch, analisiSort]);

    const totalPagesFrac = Math.max(1, Math.ceil(fraudesFiltrats.length / analisiItemsPerPage));
    const totalPagesElect = Math.max(1, Math.ceil(electoralFiltrats.length / analisiItemsPerPage));
    const totalPagesMonop = Math.max(1, Math.ceil(concentracioTemporal.length / analisiItemsPerPage));
    const totalPagesDependencia = Math.max(1, Math.ceil(dependenciaFiltrada.length / analisiItemsPerPage));

    useEffect(() => {
        if (analisiPageFrac > totalPagesFrac) setAnalisiPageFrac(totalPagesFrac);
    }, [analisiPageFrac, totalPagesFrac]);
    useEffect(() => {
        if (analisiPageElect > totalPagesElect) setAnalisiPageElect(totalPagesElect);
    }, [analisiPageElect, totalPagesElect]);
    useEffect(() => {
        if (analisiPageMonop > totalPagesMonop) setAnalisiPageMonop(totalPagesMonop);
    }, [analisiPageMonop, totalPagesMonop]);
    useEffect(() => {
        if (analisiPageDependencia > totalPagesDependencia) setAnalisiPageDependencia(totalPagesDependencia);
    }, [analisiPageDependencia, totalPagesDependencia]);

    const fraudesPaginats = fraudesFiltrats.slice((analisiPageFrac - 1) * analisiItemsPerPage, analisiPageFrac * analisiItemsPerPage);
    const electoralPaginats = electoralFiltrats.slice((analisiPageElect - 1) * analisiItemsPerPage, analisiPageElect * analisiItemsPerPage);
    const concentracioPaginada = concentracioTemporal.slice((analisiPageMonop - 1) * analisiItemsPerPage, analisiPageMonop * analisiItemsPerPage);
    const dependenciaPaginada = dependenciaFiltrada.slice((analisiPageDependencia - 1) * analisiItemsPerPage, analisiPageDependencia * analisiItemsPerPage);

    const conteoRiesgos = useMemo(() => {
        const alto = fraudes.filter(f => f.nivel_riesgo === 'ALTO').length;
        const mitja = fraudes.filter(f => f.nivel_riesgo === 'MITJÀ').length;
        const baix = fraudes.filter(f => f.nivel_riesgo === 'BAIX').length;
        return { alto, mitja, baix };
    }, [fraudes]);

    const conteoFraccionament = useMemo(() => ({
        critic: fraudes.filter(f => f.nivell === 'CRITIC').length,
        alt: fraudes.filter(f => f.nivell === 'ALT').length,
        observacio: fraudes.filter(f => f.nivell === 'OBSERVACIO').length,
        totalVisible: fraudes.filter(f => f.nivell !== 'BAIX').length,
    }), [fraudes]);

    const goToHome = () => {
        if (activeTab === 'home' || !isPageTop) {
            setIsMobileMenuOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        runRouteTransition(() => {
            handleNavigation('home', '/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    };
    const navCurrentLabel = {
        'home': 'Explorar',
        'loading': 'Explorar',
        buscador: 'Contractes',
        contracte: 'Contractes',
        empreses: 'Empreses',
        empresa: 'Empreses',
        persones: 'Persones',
        subvencions: 'Subvencions',
        entitat: 'Subvencions',
        analisi: 'Anàlisi',
        'cas-fraccionament': 'Anàlisi',
        'cas-concentracio': 'Anàlisi',
        'cas-electoralisme': 'Anàlisi',
        'cas-dependencia': 'Anàlisi',
        casos: 'Investigació',
        'cas-investigacio': 'Investigació',
        sobre: 'Sobre',
        legal: 'Avís legal'
    }[activeTab] || BRAND_NAME;

    const resetFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setTypeFilter('');
        setProcedureFilter('');
        setDateStart('');
        setDateEnd('');
        setAmountMin('');
        setAmountMax('');
        setSortBy('date-desc');
        setCurrentPage(1);
    };

    const resetAnalisiFilters = () => {
        setAnalisiSearch('');
        setAnalisiSort('risk-desc');
        setAnalisiPageFrac(1);
        setAnalisiPageMonop(1);
        setAnalisiPageElect(1);
        setAnalisiPageDependencia(1);
    };
    const activeAnalisiFiltersCount = analisiSort !== 'risk-desc' ? 1 : 0;

    const activeFiltersCount = [
        typeFilter,
        procedureFilter,
        dateStart,
        dateEnd,
        amountMin,
        amountMax,
        sortBy !== 'date-desc' ? sortBy : ''
    ].filter(Boolean).length;

    const homeTopSectors = useMemo(() => {
        if (!empreses.length && summary?.home?.top_sectors) {
            const rows = summary.home.top_sectors;
            const max = rows[0]?.amount || 1;
            return rows.map((row, index) => ({
                ...row,
                rank: index + 1,
                share: Math.max(0.08, row.amount / max)
            }));
        }
        const totals = new Map();
        empreses.forEach(empresa => {
            const sector = empresa.sector || 'Sense classificar';
            const amount = Number(empresa.total_importe) || 0;
            if (!amount || sector === 'Sense classificar') return;
            totals.set(sector, (totals.get(sector) || 0) + amount);
        });
        const rows = Array.from(totals, ([label, amount]) => ({ label, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
        const max = rows[0]?.amount || 1;
        return rows.map((row, index) => ({
            ...row,
            rank: index + 1,
            share: Math.max(0.08, row.amount / max)
        }));
    }, [empreses, summary]);

    const homeTopCategories = useMemo(() => {
        if (!empreses.length && summary?.home?.top_categories) {
            const rows = summary.home.top_categories;
            const total = rows.reduce((sum, row) => sum + row.amount, 0) || 1;
            return rows.map((row, index) => ({
                ...row,
                rank: index + 1,
                share: row.amount / total
            }));
        }
        const totals = new Map();
        empreses.forEach(empresa => {
            const categoria = empresa.categoria || 'Sense classificar';
            const amount = Number(empresa.total_importe) || 0;
            if (!amount || categoria === 'Sense classificar') return;
            totals.set(categoria, (totals.get(categoria) || 0) + amount);
        });
        const rows = Array.from(totals, ([label, amount]) => ({ label, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6);
        const total = rows.reduce((sum, row) => sum + row.amount, 0) || 1;
        return rows.map((row, index) => ({
            ...row,
            rank: index + 1,
            share: row.amount / total
        }));
    }, [empreses, summary]);

    const homeMinorContractTrend = useMemo(() => {
        if (!contracts.length && summary?.home?.minor_contract_trend) {
            return summary.home.minor_contract_trend;
        }
        const years = new Map();
        const currentYear = new Date().getFullYear();
        contracts.forEach(contract => {
            const year = String(contract.fecha || '').slice(0, 4);
            if (!/^\d{4}$/.test(year)) return;
            if (Number(year) >= currentYear) return;
            const current = years.get(year) || { year, total: 0, minor: 0, minorAmount: 0 };
            const amount = Number(contract.importe) || 0;
            current.total += 1;
            if (/menor/i.test(contract.procedimiento || '')) {
                current.minor += 1;
                current.minorAmount += amount;
            }
            years.set(year, current);
        });
        const rows = Array.from(years.values())
            .filter(row => row.total >= 50)
            .sort((a, b) => a.year.localeCompare(b.year))
            .map(row => ({
                ...row,
                percent: row.total ? row.minor / row.total : 0
            }));
        const maxPercent = Math.max(...rows.map(row => row.percent), 0.01);
        return rows.map(row => ({
            ...row,
            barScale: Math.max(0.08, row.percent / maxPercent),
            percentLabel: `${Math.round(row.percent * 100)}%`
        }));
    }, [contracts, summary]);


    const renderNavTabs = (showActive = true, useTransition = false) => {
        const handleNavClick = useTransition ? handleTransitionLinkClick : handleInternalLinkClick;
        const contractesActive = activeTab === 'buscador' || activeTab === 'contracte';
        const empresesActive = activeTab === 'empreses' || activeTab === 'empresa';
        const personesActive = activeTab === 'persones';
        const subvencionsActive = activeTab === 'subvencions' || activeTab === 'entitat';
        const analisiActive = activeTab === 'analisi' || activeTab === 'cas-fraccionament' || activeTab === 'cas-concentracio' || activeTab === 'cas-electoralisme' || activeTab === 'cas-dependencia';
        return (
            <div className="nav">
                <a href={buildRouteUrl('/contractes')} className={'nav-tab' + (showActive && contractesActive ? ' active' : '')} aria-current={showActive && contractesActive ? 'page' : undefined} onClick={(event) => handleNavClick(event, () => { handleNavigation('buscador'); setSelectedEmpresa(null); setIsMobileMenuOpen(false); })}>Contractes</a>
                <a href={buildRouteUrl('/empreses')} className={'nav-tab' + (showActive && empresesActive ? ' active' : '')} aria-current={showActive && empresesActive ? 'page' : undefined} onClick={(event) => handleNavClick(event, () => { handleNavigation('empreses'); setSelectedEmpresa(null); setIsMobileMenuOpen(false); })}>Empreses</a>
                <a href={buildRouteUrl('/persones')} className={'nav-tab' + (showActive && personesActive ? ' active' : '')} aria-current={showActive && personesActive ? 'page' : undefined} onClick={(event) => handleNavClick(event, () => { handleNavigation('persones'); setIsMobileMenuOpen(false); })}>Persones</a>
                <a href={buildRouteUrl('/subvencions')} className={'nav-tab' + (showActive && subvencionsActive ? ' active' : '')} aria-current={showActive && subvencionsActive ? 'page' : undefined} onClick={(event) => handleNavClick(event, () => { handleNavigation('subvencions'); setIsMobileMenuOpen(false); })}>Subvencions</a>
                <a href={buildRouteUrl('/analisi')} className={'nav-tab' + (showActive && analisiActive ? ' active' : '')} aria-current={showActive && analisiActive ? 'page' : undefined} onClick={(event) => handleNavClick(event, handleAnalisiNavClick)}>Anàlisi</a>
            </div>
        );
    };

    const renderSiteChrome = () => (
        <div className={'site-chrome site-chrome-light' + (isMobileMenuOpen ? ' mobile-menu-open' : '')}>
            <div className="site-chrome-gradient" aria-hidden="true"></div>
            {isMobileMenuOpen && (
                <div
                    className="mobile-menu-interaction-shield"
                    aria-hidden="true"
                />
            )}
            <div
                className="site-chrome-brand"
                onClick={goToHome}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        goToHome();
                    }
                }}
                role="link"
                tabIndex={0}
            >
                <div className="home-logo" role="img" aria-label="Iguadata"></div>
            </div>
            <div className={`site-dock-shell is-visible${isMobileMenuOpen ? ' is-open' : ''}`}>
                <nav className={'site-dock-nav nav-wrapper' + (isMobileMenuOpen ? ' open' : '')} aria-label="Navegació principal">
                    <button
                        className="mobile-nav-current"
                        type="button"
                        aria-expanded={isMobileMenuOpen}
                        onClick={() => setIsMobileMenuOpen(prev => !prev)}
                    >
                        <span className="mobile-nav-current-group">
                            <span>{navCurrentLabel}</span>
                            <svg className="mobile-nav-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                        </span>
                    </button>
                    {renderNavTabs(true, false)}
                </nav>
            </div>
        </div>
    );

    const renderSkeletonCard = (className = '') => (
        <div className={`contract-card data-skeleton-card${className ? ` ${className}` : ''}`} aria-hidden="true">
            <div className="data-skeleton-line data-skeleton-line-short"></div>
            <div className="data-skeleton-line data-skeleton-line-title"></div>
            <div className="data-skeleton-line"></div>
            <div className="data-skeleton-line data-skeleton-line-medium"></div>
        </div>
    );
    const renderInvestigacioSkeletonCopy = (lines = 3) => (
        <div className="investigacio-skeleton-copy">
            {Array.from({ length: lines }, (_, index) => (
                <div key={index} className={`data-skeleton-line${index === lines - 1 ? ' data-skeleton-line-medium' : ''}`}></div>
            ))}
        </div>
    );
    const renderInvestigacioLoading = (caso) => (
        <article className="container prose-page investigacio-detail-page investigacio-loading" role="status" aria-live="polite" aria-label="Carregant la investigació">
            <div className="page-title data-skeleton-title" aria-hidden="true"></div>
            <div className="prose-wrapper" aria-hidden="true">
                <div className="data-skeleton-line investigacio-skeleton-subtitle"></div>
                {caso?.image && <div className="data-skeleton-input investigacio-skeleton-media"></div>}
                {(caso?.content || []).map((block, index) => {
                    const key = block.id || block.type + '-' + index;
                    if (block.type === 'heading') return <div key={key} className="data-skeleton-line investigacio-skeleton-heading"></div>;
                    if (block.type === 'paragraph') return <React.Fragment key={key}>{renderInvestigacioSkeletonCopy(block.skeletonLines || 3)}</React.Fragment>;
                    if (block.type === 'contracts') {
                        return (
                            <div key={key} className="data-skeleton-list investigacio-skeleton-stack">
                                {Array.from({ length: (block.slugs || []).length }, (_, cardIndex) => <React.Fragment key={cardIndex}>{renderSkeletonCard()}</React.Fragment>)}
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        </article>
    );
    const renderDataLoading = () => {
        if (activeTab === 'cas-investigacio') return renderInvestigacioLoading(activeInvestigacioCase);
        const isAnalisiLoading = ANALYSIS_TABS.includes(activeTab);
        const pageClass =
            activeTab === 'persones' ? 'persones-page' :
                activeTab === 'empreses' || activeTab === 'empresa' ? 'empreses-page' :
                    isAnalisiLoading ? 'analisi-page' :
                        'contractes-page';
        const cardClass =
            activeTab === 'persones' ? 'persona-card' :
                activeTab === 'empreses' ? 'empresa-list-card' :
                    isAnalisiLoading ? 'fraccionament-card' :
                        '';
        const cardCount = activeTab === 'empresa' ? 2 : 4;

        return (
            <div className={`container data-loading-container ${pageClass}`} role="status" aria-live="polite" aria-label="Carregant dades">
                <div className="page-title data-skeleton-title" aria-hidden="true"></div>
                {activeTab !== 'empresa' && (
                    <div className={`search-section data-skeleton-search${isAnalisiLoading ? ' analisi-search-section' : ''}`} aria-hidden="true">
                        <div className="data-skeleton-input"></div>
                        <div className="data-skeleton-actions">
                            <div className="data-skeleton-control"></div>
                            <div className="data-skeleton-control data-skeleton-control-square"></div>
                        </div>
                    </div>
                )}
                <div className="data-skeleton-list" aria-hidden="true">
                    {Array.from({ length: cardCount }, (_, index) => (
                        <React.Fragment key={index}>{renderSkeletonCard(cardClass)}</React.Fragment>
                    ))}
                </div>
            </div>
        );
    };
    const renderDataError = () => (
        <div className="container data-loading-container">
            <div className="empty-state" role="alert">
                <div className="empty-state-icon" aria-hidden="true">!</div>
                <div className="empty-state-title">No s'han pogut carregar les dades</div>
                <div className="empty-state-text">Comprova la connexió i torna-ho a provar.</div>
                <div className="empty-state-action">
                    <button className="empty-state-btn" onClick={retryActiveData} type="button">Tornar-ho a provar</button>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return <HomeLoading homeCanvasRef={homeCanvasRef} loadingProgress={loadingProgress} />;
    }

    const handleDetailClick = (contract) => {
        setSelectedContractForDetail(contract);
        const detailPath = contract.evidencia_congelada === true
            ? `/contractes/evidencia/${contract.slug}`
            : `/contractes/${contract.slug}`;
        handleNavigation('contracte', detailPath, { keepFilters: true });
    };

    const handleCasoClick = (caso) => {
        setSelectedCasoDetail(caso);
        handleNavigation('cas-fraccionament', `/analisi/fraccionament/${caso.id}`);
    };

    const handleConcentracioClick = (caso) => {
        setSelectedConcentracioDetail(caso);
        handleNavigation('cas-concentracio', `/analisi/concentracio/${caso.id}`);
    };

    const handleElectoralismeClick = (caso) => {
        setSelectedElectoralismeDetail(caso);
        handleNavigation('cas-electoralisme', `/analisi/electoralisme/${caso.id}`);
    };

    const handleDependenciaClick = (caso) => {
        setSelectedDependenciaDetail(caso);
        handleNavigation('cas-dependencia', `/analisi/dependencia/${caso.id}`);
    };

    const handleInvestigacioClick = (caso) => {
        handleNavigation('cas-investigacio', '/investigacio/' + caso.slug);
    };

    const handleAnalisiNavClick = () => {
        const isAnalisiList = activeTab === 'analisi';
        const isAtTop = window.scrollY < 24;
        resetAnalisiFilters();
        if (!isAnalisiList) {
            setAnalisiTab('fraccionament');
        } else if (isAtTop) {
            setAnalisiTab('fraccionament');
        }
        handleNavigation('analisi');
        setIsMobileMenuOpen(false);
    };

    const handleAnalisiTabKeyDown = (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const tabs = ['fraccionament', 'monopoli', 'electoral', 'dependencia'];
        const currentIndex = tabs.indexOf(analisiTab);
        let nextIndex = currentIndex;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        const nextTab = tabs[nextIndex];
        setAnalisiTab(nextTab);
        if (nextTab === 'monopoli') setConcentracioMode('temporal');
        requestAnimationFrame(() => {
            const tabButtons = event.currentTarget.parentElement.querySelectorAll('[role="tab"]');
            tabButtons[nextIndex]?.focus();
        });
    };

    const handleEmpresaClick = (empresaName) => {
        setSelectedContractForDetail(null);
        setSelectedEmpresa(empresaName);
        if (activeTab === 'buscador' || activeTab === 'persones') {
            setSourceTabForCompany(activeTab);
        } else {
            setSourceTabForCompany('empreses');
        }

        const emp = empreses.find(e => e.nom === empresaName);
        if (emp && emp.slug) {
            handleNavigation('empresa', `/empreses/${emp.slug}`);
        } else {
            handleNavigation('empresa');
        }
    };

    const handleEntitatClick = subvencio => {
        handleNavigation('entitat', `/entitats/${subvencio.entitat_slug}`);
    };

    const goBack = (fallback) => {
        saveCurrentScroll();
        const referrerPath = document.referrer ? new URL(document.referrer).pathname : '';
        const hasInternalReferrer = referrerPath && referrerPath.startsWith(BASE || '/');
        if (hasInternalReferrer || window.history.length > 1) {
            window.history.back();
        } else if (fallback) {
            fallback();
        }
    };

    return (
        <div className={activeTab === 'home' ? 'home-wrapper' : 'app-shell app-shell-chrome'}>
            {activeTab !== 'home' && renderSiteChrome()}

            {activeTab === 'home' && (
                <>
                    <HomeChrome goToHome={goToHome} />
                    <main id="main-content" className="home-dissolve-stage">
                        <HomeSection
                            extraClassName={homeIntroFading ? 'home-intro-target' : ''}
                            homeCanvasRef={homeCanvasRef}
                            handleHomeMetricLinkClick={handleHomeMetricLinkClick}
                            handleNavigation={handleNavigation}
                            setIsMobileMenuOpen={setIsMobileMenuOpen}
                            handleAnalisiNavClick={handleAnalisiNavClick}
                            contractCount={contractCount}
                            subvencionsCount={subvencionsCount}
                            empresasCount={empresasCount}
                            personesCount={personesCount}
                            alertesCount={alertesCount}
                            homeTopSectors={homeTopSectors}
                            homeTopCategories={homeTopCategories}
                            homeRiskCounts={homeRiskCounts}
                        />
                        {homeIntroFading && <HomeLoading isDissolving homeCanvasRef={homeCanvasRef} loadingProgress={loadingProgress} />}
                    </main>
                </>
            )}

            {activeTab !== 'home' && (
                <main id="main-content" className="site-main" tabIndex={-1}>
            {activeDataError ? renderDataError() : (isDataTabLoading && renderDataLoading())}

            {activeTab === 'buscador' && canRenderDataTab && (
                <div className="container contractes-page">
                    <h1 className="page-title">Cercador de contractes</h1>
                    <div className="search-section">
                        <SearchField
                            value={searchTerm}
                            onValueChange={(value) => { setSearchTerm(value); setCurrentPage(1); }}
                            placeholder="Cerca per descripció, empresa o codi d'expedient"
                            ariaLabel="Cerca per descripció, empresa o codi d'expedient"
                        />

                        <FilterActions
                            open={filtersOpen}
                            onToggle={() => setFiltersOpen(prev => !prev)}
                            activeCount={activeFiltersCount}
                            onReset={resetFilters}
                            controlsId="contract-filter-primary contract-filter-secondary"
                        />

                        <div id="contract-filter-primary" className={"filters search-filter-panel" + (!filtersOpen ? " collapsed" : "")}>
                            <div className="filter-group filter-group-standard">
                                <label className="filter-label">Ordenar per</label>
                                <select className="filter-select filter-select-standard" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }} aria-label="Ordenar contractes per">
                                    <option value="date-desc">Data (més recents)</option>
                                    <option value="date-asc">Data (més antics)</option>
                                    <option value="amount-desc">Import (descendent)</option>
                                    <option value="amount-asc">Import (ascendent)</option>
                                </select>
                            </div>
                            <div className="filter-group filter-group-standard">
                                <label className="filter-label">Procediment</label>
                                <select className="filter-select filter-select-standard" value={procedureFilter} onChange={(e) => { setProcedureFilter(e.target.value); setCurrentPage(1); }} aria-label="Procediment">
                                    <option value="">Tots els procediments</option>
                                    <option value="Menor">Menor</option>
                                    <option value="Obert">Obert</option>
                                    <option value="Negociat sense publicitat">Negociat sense publicitat</option>
                                    <option value="Licitació amb negociació">Licitació amb negociació</option>
                                    <option value="Adjudicacions directes no menors">Adjudicació directa</option>
                                    <option value="Específic de sistema dinàmic de contractació">Sistema dinàmic</option>
                                </select>
                            </div>
                            <div className="filter-group filter-group-standard">
                                <label className="filter-label">Tipus</label>
                                <select className="filter-select filter-select-standard" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }} aria-label="Tipus de contracte">
                                    <option value="">Tots els tipus</option>
                                    <option value="1. OBRES">Obres</option>
                                    <option value="3. SUBMINISTRAMENTS">Subministraments</option>
                                    <option value="5. SERVEIS">Serveis</option>
                                    <option value="6. ADMINISTRATIU ESPECIAL">Administratiu especial</option>
                                    <option value="2. GESTIÓ DE SERVEI PÚBLIC">Gestió de servei públic</option>
                                    <option value="8. CONCESSIÓ DE SERVEIS">Concessió de serveis</option>
                                    <option value="10. PRIVAT D'ADMINISTRACIO PUBLICA">Privat d'administració pública</option>
                                </select>
                            </div>
                        </div>

                        <div id="contract-filter-secondary" className={"filters-row search-filter-panel search-filter-panel-secondary" + (!filtersOpen ? " collapsed" : "")}>
                            <div className="filter-group">
                                <label className="filter-label">Data inici</label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    aria-label="Data inici"
                                    value={dateStart}
                                    onChange={(e) => { setDateStart(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Data final</label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    aria-label="Data final"
                                    value={dateEnd}
                                    onChange={(e) => { setDateEnd(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Des de</label>
                                <input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import mínim" aria-label="Import mínim" value={amountMin} onChange={(e) => { setAmountMin(e.target.value); setCurrentPage(1); }} />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Fins a</label>
                                <input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import màxim" aria-label="Import màxim" value={amountMax} onChange={(e) => { setAmountMax(e.target.value); setCurrentPage(1); }} />
                            </div>
                        </div>
                    </div>

                    <div className="results-count" role="status" aria-live="polite">
                        <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{contractesFiltrats.length}</strong> contractes</span>
                        {contractesFiltrats.length > itemsPerPage && (
                            <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
                        )}
                    </div>

                    {contractesPaginats.map(c => (
                        <a
                            key={c.id}
                            href={buildRouteUrl(`/contractes/${c.slug}`)}
                            className="card-link-wrapper"
                            onClick={(event) => handleInternalLinkClick(event, () => handleDetailClick(c))}
                        >
                            <div className="contract-card">
                                <div className="contract-header">
                                    <div className="contract-title">{c.descripcion}</div>
                                    <div className="contract-amount">{formatCurrency(c.importe)}</div>
                                </div>
                                <div className="contract-meta">
                                    <div className="contract-meta-item">
                                        <span className="contract-meta-label">Empresa adjudicatària</span>
                                        <span className="contract-meta-value">{c.adjudicatario}</span>
                                    </div>
                                    <div className="contract-meta-item">
                                        <span className="contract-meta-label">Data</span>
                                        <span className="contract-meta-value">{formatDate(c.fecha)}</span>
                                    </div>
                                    <div className="contract-meta-item">
                                        <span className="contract-meta-label">Codi expedient</span>
                                        <span className="contract-meta-value">{c.codigo}</span>
                                    </div>
                                    <div className="contract-pills">
                                        <span className="contract-pill">{formatTipus(c.tipo)}</span>
                                        <span className="contract-pill procedure">{formatProcediment(c.procedimiento)}</span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    ))}

                    {contractesFiltrats.length === 0 && (
                        <EmptySearchState text="No s'han trobat contractes." onReset={resetFilters} />
                    )}

                    {contractesFiltrats.length > itemsPerPage && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}

                    <div className="metodologia-wrapper">
                        <div className="metodologia">
                            <h3 className="metodologia-legal-title">Metodologia</h3>
                            <p className="metodologia-intro">
                                Els contractes que apareixen en aquest cercador corresponen a les licitacions i adjudicacions publicades al Registre Públic de Contractes de la Generalitat de Catalunya.
                            </p>
                            <p className="metodologia-intro">
                                L'import que figura a cada contracte és el valor d'adjudicació publicat oficialment. Aparèixer en aquest registre reflecteix únicament la informació de contractació pública disponible, i no implica cap irregularitat. Les dades poden contenir errors derivats de fonts públiques o processos automatitzats, i qualsevol correcció factual serà revisada.
                            </p>
                            <p className="metodologia-intro">
                                El tractament de les dades es realitza a l'empara de l'article 6.1.e) del Reglament UE 2016/679 (RGPD) d'interès públic i de la Llei 19/2013, de 9 de desembre, de transparència, accés a la informació pública i bon govern, que estableix l'obligació de publicitat activa en matèria de contractació pública. Les dades es limiten a la informació estrictament necessària per al propòsit de transparència i es tracten d'acord amb el principi de minimització de dades (art. 5.1.c RGPD). Tota la informació publicada prové de fonts oficials de caràcter públic i no inclou dades de la vida privada de les persones.
                            </p>
                            <p className="metodologia-intro metodologia-intro-last">
                                Les persones interessades poden exercir els drets d'accés, rectificació, limitació o oposició al tractament posant-se en contacte a través de la secció <a href="/avis-legal" className="prose-link">Avís legal</a>. El dret de supressió (dret a l'oblit) queda limitat per l'art. 17.3.b) del RGPD quan les dades figuren en registres oficials públics o en documentació administrativa de contractació pública, sense perjudici del dret a sol·licitar la revisió de possibles errors factuals.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'empreses' && !selectedEmpresa && canRenderDataTab && (
                <EmpresesView
                    empreses={empreses}
                    onEmpresaSelect={handleEmpresaClick}
                    searchTerm={empresesSearch}
                    setSearchTerm={setEmpresesSearch}
                    sectorFilter={empresesSector}
                    setSectorFilter={setEmpresesSector}
                    categoriaFilter={empresesCategoria}
                    setCategoriaFilter={setEmpresesCategoria}
                    sortBy={empresesSort}
                    setSortBy={setEmpresesSort}
                    currentPage={empresesPage}
                    setCurrentPage={setEmpresesPage}
                />
            )}

            {activeTab === 'persones' && canRenderDataTab && (
                <PersonesView
                    persones={persones}
                    onEmpresaSelect={handleEmpresaClick}
                    onNavigateLegal={() => { handleNavigation('legal'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    searchTerm={personesSearch}
                    setSearchTerm={setPersonesSearch}
                    sortBy={personesSort}
                    setSortBy={setPersonesSort}
                    currentPage={personesPage}
                    setCurrentPage={setPersonesPage}
                    expandedIdx={personesExpanded}
                    setExpandedIdx={setPersonesExpanded}
                />
            )}

            {activeTab === 'subvencions' && canRenderDataTab && (
                <SubvencionsView subvencions={subvencions} onEntitatSelect={handleEntitatClick} />
            )}

            {activeTab === 'entitat' && activeEntitatSubvencions.length > 0 && canRenderDataTab && (
                <EntitatView
                    entitatSlug={activeEntitatSlug}
                    subvencions={subvencions}
                    onBack={() => goBack(() => handleNavigation('subvencions', '/subvencions'))}
                />
            )}

            {activeTab === 'casos' && (
                <CasosView casos={casosInvestigacio} onCasoSelect={handleInvestigacioClick} />
            )}


            {activeTab === 'cas-investigacio' && canRenderDataTab && (
                <InvestigacioCaseView
                    caso={activeInvestigacioCase}
                    contracts={contracts}
                    onBack={() => goBack(() => handleNavigation('casos', '/investigacio'))}
                    onContractSelect={handleDetailClick}
                />
            )}
            {activeTab === 'contracte' && selectedContractForDetail && canRenderDataTab && (
                <ContractDetailView
                    contract={selectedContractForDetail}
                    empreses={empreses}
                    onBack={() => goBack(() => { handleNavigation('buscador', null, { keepFilters: true }); setSelectedContractForDetail(null); })}
                    onEmpresaClick={handleEmpresaClick}
                />
            )}

            {activeTab === 'empresa' && selectedEmpresa && canRenderDataTab && (
                <EmpresaView
                    empresa={selectedEmpresa}
                    contracts={contracts}
                    empreses={empreses}
                    administradors={administradors}
                    onBack={() => goBack(() => { handleNavigation(sourceTabForCompany, null, { keepFilters: true }); setSelectedEmpresa(null); })}
                    onContractSelect={handleDetailClick}
                />
            )}

            {activeTab === 'cas-fraccionament' && selectedCasoDetail && canRenderDataTab && (
                <CasFraccionamentView
                    caso={selectedCasoDetail}
                    contracts={contracts}
                    empreses={empreses}
                    onBack={() => goBack(() => { handleNavigation('analisi', '/analisi'); setSelectedCasoDetail(null); })}
                    onContractSelect={handleDetailClick}
                    onEmpresaClick={handleEmpresaClick}
                />
            )}

            {activeTab === 'cas-concentracio' && selectedConcentracioDetail && canRenderDataTab && (
                <CasConcentracioView
                    caso={selectedConcentracioDetail}
                    contracts={contracts}
                    empreses={empreses}
                    onBack={() => goBack(() => { handleNavigation('analisi', '/analisi'); setSelectedConcentracioDetail(null); })}
                    onContractSelect={handleDetailClick}
                    onEmpresaClick={handleEmpresaClick}
                />
            )}

            {activeTab === 'cas-electoralisme' && selectedElectoralismeDetail && canRenderDataTab && (
                <CasElectoralismeView
                    caso={selectedElectoralismeDetail}
                    contracts={contracts}
                    empreses={empreses}
                    onBack={() => goBack(() => { handleNavigation('analisi', '/analisi'); setSelectedElectoralismeDetail(null); })}
                    onContractSelect={handleDetailClick}
                    onEmpresaClick={handleEmpresaClick}
                />
            )}

            {activeTab === 'cas-dependencia' && selectedDependenciaDetail && canRenderDataTab && (
                <CasDependenciaView
                    caso={selectedDependenciaDetail}
                    onBack={() => goBack(() => { handleNavigation('analisi', '/analisi'); setSelectedDependenciaDetail(null); })}
                />
            )}

            {activeTab === 'analisi' && canRenderDataTab && (
                <>
                    <div className={'analisi-tabs-wrapper' + (!isPageTop ? ' is-hidden-on-scroll' : '')}>
                        <div className="analisi-tabs" role="tablist" aria-label="Tipus d'anàlisi">
                        <button
                            id="analisi-tab-electoral"
                            className={'analisi-tab' + (analisiTab === 'fraccionament' ? ' active' : '')}
                            onClick={() => setAnalisiTab('fraccionament')}
                            type="button"
                            role="tab"
                            aria-selected={analisiTab === 'fraccionament'}
                            aria-controls="analisi-panel"
                            tabIndex={analisiTab === 'fraccionament' ? 0 : -1}
                            onKeyDown={handleAnalisiTabKeyDown}
                        >
                            Fraccionament
                        </button>
                        <button
                            className={'analisi-tab' + (analisiTab === 'monopoli' ? ' active' : '')}
                            onClick={() => { setAnalisiTab('monopoli'); setConcentracioMode('temporal'); }}
                            type="button"
                            role="tab"
                            aria-selected={analisiTab === 'monopoli'}
                            aria-controls="analisi-panel"
                            tabIndex={analisiTab === 'monopoli' ? 0 : -1}
                            onKeyDown={handleAnalisiTabKeyDown}
                        >
                            Concentració
                        </button>
                        <button
                            className={'analisi-tab' + (analisiTab === 'electoral' ? ' active' : '')}
                            onClick={() => setAnalisiTab('electoral')}
                            type="button"
                            role="tab"
                            aria-selected={analisiTab === 'electoral'}
                            aria-controls="analisi-panel"
                            tabIndex={analisiTab === 'electoral' ? 0 : -1}
                            onKeyDown={handleAnalisiTabKeyDown}
                        >
                            Electoralisme
                        </button>
                        <button
                            id="analisi-tab-dependencia"
                            className={'analisi-tab' + (analisiTab === 'dependencia' ? ' active' : '')}
                            onClick={() => setAnalisiTab('dependencia')}
                            type="button"
                            role="tab"
                            aria-selected={analisiTab === 'dependencia'}
                            aria-controls="analisi-panel"
                            tabIndex={analisiTab === 'dependencia' ? 0 : -1}
                            onKeyDown={handleAnalisiTabKeyDown}
                        >
                            Dependència
                        </button>
                        </div>
                        <div className={'analisi-mobile-selector' + (isAnalisiMobileMenuOpen ? ' open' : '')}>
                            <button
                                className="analisi-mobile-current"
                                type="button"
                                aria-expanded={isAnalisiMobileMenuOpen}
                                aria-controls="analisi-mobile-options"
                                onClick={() => setIsAnalisiMobileMenuOpen(open => !open)}
                            >
                                <span className="analisi-mobile-current-group">
                                    <span>{analisiTab === 'fraccionament' ? 'Fraccionament' : analisiTab === 'monopoli' ? 'Concentració' : analisiTab === 'electoral' ? 'Electoralisme' : 'Dependència'}</span>
                                    <svg className="analisi-mobile-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                                </span>
                            </button>
                            <div id="analisi-mobile-options" className="analisi-mobile-options">
                                {[
                                    ['fraccionament', 'Fraccionament'],
                                    ['monopoli', 'Concentració'],
                                    ['electoral', 'Electoralisme'],
                                    ['dependencia', 'Dependència']
                                ].filter(([value]) => value !== analisiTab).map(([value, label]) => (
                                    <button
                                        key={value}
                                        className="analisi-mobile-option"
                                        type="button"
                                        onClick={() => {
                                            setAnalisiTab(value);
                                            if (value === 'monopoli') setConcentracioMode('temporal');
                                            setIsAnalisiMobileMenuOpen(false);
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div
                        className={`container analisi-page analisi-page-reordered analisi-page-${analisiTab}${analisiTab === 'monopoli' ? ` concentracio-mode-${concentracioMode}` : ''}`}
                        id="analisi-panel"
                        role="tabpanel"
                        aria-labelledby={`analisi-tab-${analisiTab}`}
                    >
                        <h1 className="page-title">
                            {analisiTab === 'fraccionament'
                                ? 'Anàlisi de fraccionament'
                                : analisiTab === 'monopoli'
                                    ? 'Anàlisi de concentració'
                                    : analisiTab === 'electoral'
                                        ? "Anàlisi d'electoralisme"
                                        : 'Anàlisi de dependència'}
                        </h1>
                        <p className="investigacio-detail-subtitle analisi-page-subtitle">
                            {analisiTab === 'fraccionament'
                                ? "Contractes menors agrupats que poden indicar una possible divisió d'un mateix encàrrec"
                                : analisiTab === 'monopoli'
                                    ? "Concentració d'adjudicacions de contractes en una mateixa empresa o xarxa mercantil"
                                    : analisiTab === 'electoral'
                                        ? 'Contractes de comunicació, difusió o visibilitat pública adjudicats en períodes electorals'
                                        : 'Acumulació de subvencions directes en una mateixa entitat'}
                        </p>

                        {analisiTab === 'fraccionament' && (
                            <>
                                <div className="metodologia-wrapper">
                                    <div className="metodologia">
                                        <h3 className="metodologia-title">Metodologia</h3>
                                        <p className="metodologia-intro">L'algoritme Iguadata de fraccionament detecta grups de contractes menors que poden ser compatibles amb una possible divisió d'un mateix encàrrec en diversos contractes per evitar el concurs públic. També incorpora contractes menors individuals molt propers al límit legal, imports rodons o ajustats al llindar i repeticions multianuals del mateix objecte. La identificació de patrons estadísticament rellevants i les alertes generades no impliquen cap irregularitat legal confirmada i han de ser interpretades en context.</p>
                                        <div className="metodologia-steps-compact">
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">01</span>
                                                <span className="metodologia-step-text-compact">Selecció dels contractes amb procediment menor</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">02</span>
                                                <span className="metodologia-step-text-compact">Agrupació dels contractes adjudicats a la mateixa empresa</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">03</span>
                                                <span className="metodologia-step-text-compact">Encreuament amb dades mercantils per detectar empreses que comparteixen administradors</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">04</span>
                                                <span className="metodologia-step-text-compact">Reconeixement dels contractes amb similitud rellevant en el seu objecte</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">05</span>
                                                <span className="metodologia-step-text-compact">Identificació dels contractes amb proximitat temporal</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">06</span>
                                                <span className="metodologia-step-text-compact">Comparació dels imports acumulats o individuals amb el límit legal del contracte menor</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">07</span>
                                                <span className="metodologia-step-text-compact">Puntuació i classificació visual segons el nivell de risc</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="search-section analisi-search-section">
                                    <SearchField
                                        value={analisiSearch}
                                        onValueChange={setAnalisiSearch}
                                        placeholder="Cerca per descripció, empresa o codi de cas"
                                        ariaLabel="Cerca casos de fraccionament"
                                    />

                                    <FilterActions
                                        open={analisiFiltersOpen}
                                        onToggle={() => setAnalisiFiltersOpen(prev => !prev)}
                                        activeCount={activeAnalisiFiltersCount}
                                        onReset={resetAnalisiFilters}
                                        controlsId="analisi-filter-panel-fraccionament"
                                    />

                                    <div id="analisi-filter-panel-fraccionament" className={"filters search-filter-panel search-filter-panel-analysis" + (!analisiFiltersOpen ? " collapsed" : "")}>
                                        <div className="filter-group filter-group-wide">
                                            <label className="filter-label">Ordenar per</label>
                                            <select className="filter-select filter-select-standard" value={analisiSort} onChange={(e) => setAnalisiSort(e.target.value)} aria-label="Ordenar casos de fraccionament per">
                                                <option value="risk-desc">Puntuació de risc (descendent)</option>
                                                <option value="risk-asc">Puntuació de risc (ascendent)</option>
                                                <option value="amount-desc">Import (descendent)</option>
                                                <option value="amount-asc">Import (ascendent)</option>
                                                <option value="date-desc">Data (més recents)</option>
                                                <option value="date-asc">Data (més antics)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="results-count" role="status" aria-live="polite">
                                    <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{fraudesFiltrats.length}</strong> alertes</span>
                                    {fraudesFiltrats.length > analisiItemsPerPage && (
                                        <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{analisiPageFrac}</strong> de <strong>{totalPagesFrac}</strong></span>
                                    )}
                                </div>

                                <div className="analisi-alert-list">
                                    {fraudesPaginats.map(caso => (
                                        <a key={caso.id} href={buildRouteUrl(`/analisi/fraccionament/${caso.id}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => handleCasoClick(caso))}>
                                            <div className="contract-card analysis-list-card fraccionament-card">
                                                <div className="contract-header">
                                                    <div className="contract-title">{(caso.empreses || []).slice(0, 2).join(' & ')}</div>
                                                    <div className="contract-amount">{formatCurrency(caso.import_total)}</div>
                                                </div>
                                                <div className="contract-meta analysis-list-meta">
                                                    <div className="contract-meta-item analysis-list-primary analysis-list-primary-long">
                                                        <span className="contract-meta-label">Objecte</span>
                                                        <span className="contract-meta-value">{(caso.contractes && caso.contractes[0] && caso.contractes[0].descripcion) || ''}</span>
                                                    </div>
                                                    <div className="contract-pills">
                                                        <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                                                        <span className={"risk-badge " + riskClass(caso.nivell)}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>

                                {fraudesFiltrats.length === 0 && (
                                    <EmptySearchState text="No s'han trobat alertes de fraccionament." onReset={resetAnalisiFilters} />
                                )}

                                {fraudesFiltrats.length > analisiItemsPerPage && (
                                    <Pagination
                                        currentPage={analisiPageFrac}
                                        totalPages={totalPagesFrac}
                                        onPageChange={setAnalisiPageFrac}
                                    />
                                )}
                            </>
                        )}

                        {analisiTab === 'monopoli' && (
                            <>
                                <div className="metodologia-wrapper">
                                    <div className="metodologia">
                                        <h3 className="metodologia-title">Metodologia</h3>
                                        <p className="metodologia-intro">L'algoritme Iguadata de concentració identifica quines empreses tenen més pes dins de cada sector i detecta períodes curts en què una mateixa empresa acumula un nombre elevat de contractes. La identificació de patrons estadísticament rellevants i les alertes generades no impliquen cap irregularitat legal confirmada i han de ser interpretades en context.</p>
                                        <div className="metodologia-steps-compact">
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">01</span>
                                                <span className="metodologia-step-text-compact">Classificació dels contractes per sector de cada empresa adjudicatària</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">02</span>
                                                <span className="metodologia-step-text-compact">Càlcul del volum total adjudicat dins de cada sector</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">03</span>
                                                <span className="metodologia-step-text-compact">Identificació de l'empresa amb més pes històric en cada sector</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">04</span>
                                                <span className="metodologia-step-text-compact">Comparació de la quota de mercat de l'empresa dominant respecte al conjunt del sector</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">05</span>
                                                <span className="metodologia-step-text-compact">Detecció de períodes curts on una mateixa empresa acumula molts contractes dins del seu sector</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">06</span>
                                                <span className="metodologia-step-text-compact">Mesura de la intensitat de cada concentració temporal</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">07</span>
                                                <span className="metodologia-step-text-compact">Encreuament amb dades mercantils per detectar possibles concentracions entre empreses connectades per administradors comuns</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">08</span>
                                                <span className="metodologia-step-text-compact">Filtratge dels casos amb poca base estadística o sense prou activitat sectorial</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">09</span>
                                                <span className="metodologia-step-text-compact">Puntuació i classificació visual segons el nivell de risc</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="concentracio-mode-switch" role="group" aria-label="Tipus de concentració">
                                    <button
                                        type="button"
                                        className={'concentracio-mode-btn' + (concentracioMode === 'temporal' ? ' active' : '')}
                                        onClick={() => setConcentracioMode('temporal')}
                                    >
                                        Temporals
                                    </button>
                                    <button
                                        type="button"
                                        className={'concentracio-mode-btn' + (concentracioMode === 'historic' ? ' active' : '')}
                                        onClick={() => setConcentracioMode('historic')}
                                    >
                                        Sectors
                                    </button>
                                </div>

                                {concentracioMode === 'temporal' && (
                                <div className="search-section analisi-search-section">
                                        <SearchField
                                            value={analisiSearch}
                                            onValueChange={setAnalisiSearch}
                                            placeholder="Cerca per descripció, empresa o codi de cas"
                                            ariaLabel="Cerca casos de concentració"
                                        />

                                        <FilterActions
                                            open={analisiFiltersOpen}
                                            onToggle={() => setAnalisiFiltersOpen(prev => !prev)}
                                            activeCount={activeAnalisiFiltersCount}
                                            onReset={resetAnalisiFilters}
                                            controlsId="analisi-filter-panel-concentracio"
                                        />

                                        <div id="analisi-filter-panel-concentracio" className={"filters search-filter-panel search-filter-panel-analysis" + (!analisiFiltersOpen ? " collapsed" : "")}>
                                            <div className="filter-group filter-group-wide">
                                                <label className="filter-label">Ordenar per</label>
                                                <select className="filter-select filter-select-standard" value={analisiSort} onChange={(e) => setAnalisiSort(e.target.value)} aria-label="Ordenar casos de concentració per">
                                                    <option value="risk-desc">Puntuació de risc (descendent)</option>
                                                    <option value="risk-asc">Puntuació de risc (ascendent)</option>
                                                    <option value="amount-desc">Import (descendent)</option>
                                                    <option value="amount-asc">Import (ascendent)</option>
                                                    <option value="date-desc">Data (més recents)</option>
                                                    <option value="date-asc">Data (més antics)</option>
                                                </select>
                                            </div>
                                        </div>
                                </div>

                                )}

                                {concentracioMode === 'historic' && (
                                    <>
                                        <div className="analisi-alert-list">
                                            {concentracioHistoric.map(caso => (
                                                <a key={caso.id} href={buildRouteUrl(`/analisi/concentracio/${caso.id}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => handleConcentracioClick(caso))}>
                                                    <div className="contract-card analysis-list-card concentracio-card concentracio-card-historic">
                                                        <div className="contract-header">
                                                            <div className="contract-title">{formatSectorName(caso.sector)}</div>
                                                            <div className="contract-amount">{formatCurrency(caso.import_concentrat)}</div>
                                                        </div>
                                                        <div className="contract-meta analysis-list-meta">
                                                            <div className="contract-meta-item analysis-list-primary">
                                                                <span className="contract-meta-label">Empresa dominant</span>
                                                                <span className="contract-meta-value">{(caso.empreses || []).slice(0, 2).join(' · ')}</span>
                                                            </div>
                                                            <div className="contract-meta-item analysis-list-secondary">
                                                                <span className="contract-meta-label">Quota de mercat</span>
                                                                <span className="contract-meta-value">{formatPercent(caso.quota_import)}</span>
                                                            </div>
                                                            <div className="contract-pills">
                                                                <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                                                                <span className={"risk-badge " + riskClass(caso.nivell)}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {concentracioMode === 'temporal' && (
                                    <>
                                        <div className="results-count" role="status" aria-live="polite">
                                            <span className="results-count-total">S'han trobat <strong>{concentracioTemporal.length}</strong> concentracions</span>
                                            {concentracioTemporal.length > analisiItemsPerPage && (
                                                <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{analisiPageMonop}</strong> de <strong>{totalPagesMonop}</strong></span>
                                            )}
                                        </div>

                                        <div className="analisi-alert-list">
                                            {concentracioPaginada.map(caso => (
                                                <a key={caso.id} href={buildRouteUrl(`/analisi/concentracio/${caso.id}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => handleConcentracioClick(caso))}>
                                                    <div className="contract-card analysis-list-card concentracio-card concentracio-card-temporal">
                                                        <div className="contract-header">
                                                            <div className="contract-title">{formatSectorName(caso.sector)}</div>
                                                            <div className="contract-amount">{formatCurrency(caso.import_concentrat)}</div>
                                                        </div>
                                                        <div className="contract-meta analysis-list-meta">
                                                            <div className="contract-meta-item analysis-list-primary">
                                                                <span className="contract-meta-label">{caso.tipus_concentracio === 'xarxa' ? 'Xarxa mercantil' : 'Empresa dominant'}</span>
                                                                <span className="contract-meta-value">{(caso.empreses || []).slice(0, 2).join(' · ')}</span>
                                                            </div>
                                                            <div className="contract-meta-item analysis-list-secondary">
                                                                <span className="contract-meta-label">Període</span>
                                                                <span className="contract-meta-value">Del {formatDate(caso.data_inici)} al {formatDate(caso.data_fi)}</span>
                                                            </div>
                                                            <div className="contract-pills">
                                                                <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                                                                <span className={"risk-badge " + riskClass(caso.nivell)}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>

                                        {concentracioTemporal.length === 0 && (
                                            <EmptySearchState text="No s'han trobat concentracions temporals." onReset={resetAnalisiFilters} />
                                        )}

                                        {concentracioTemporal.length > analisiItemsPerPage && (
                                            <Pagination
                                                currentPage={analisiPageMonop}
                                                totalPages={totalPagesMonop}
                                                onPageChange={setAnalisiPageMonop}
                                            />
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {analisiTab === 'electoral' && (
                            <>
                                <div className="metodologia-wrapper">
                                    <div className="metodologia">
                                        <h3 className="metodologia-title">Metodologia</h3>
                                        <p className="metodologia-intro">L'algoritme Iguadata d'electoralisme detecta contractes de comunicació, difusió, publicitat institucional o actes públics adjudicats durant períodes electorals. La identificació de patrons estadísticament rellevants i les alertes generades no impliquen cap irregularitat legal confirmada i han de ser interpretades en context.</p>
                                        <div className="metodologia-steps-compact">
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">01</span>
                                                <span className="metodologia-step-text-compact">Definició dels períodes electorals municipals segons la LOREG i finestres administratives prèvia i posterior</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">02</span>
                                                <span className="metodologia-step-text-compact">Selecció dels contractes adjudicats dins d'aquestes finestres temporals</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">03</span>
                                                <span className="metodologia-step-text-compact">Anàlisi de l'objecte dels contractes per detectar conceptes incompatibles amb la neutralitat del període electoral</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">04</span>
                                                <span className="metodologia-step-text-compact">Comparació amb períodes equivalents d'anys no electorals per excloure la recurrència</span>
                                            </div>
                                            <div className="metodologia-step-compact">
                                                <span className="metodologia-step-num-compact">05</span>
                                                <span className="metodologia-step-text-compact">Puntuació i classificació visual segons el nivell de risc</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="search-section analisi-search-section">
                                    <SearchField
                                        value={analisiSearch}
                                        onValueChange={setAnalisiSearch}
                                        placeholder="Cerca per descripció, empresa o codi de cas"
                                        ariaLabel="Cerca casos d'electoralisme"
                                    />

                                    <FilterActions
                                        open={analisiFiltersOpen}
                                        onToggle={() => setAnalisiFiltersOpen(prev => !prev)}
                                        activeCount={activeAnalisiFiltersCount}
                                        onReset={resetAnalisiFilters}
                                        controlsId="analisi-filter-panel-electoralisme"
                                    />

                                    <div id="analisi-filter-panel-electoralisme" className={"filters search-filter-panel search-filter-panel-analysis" + (!analisiFiltersOpen ? " collapsed" : "")}>
                                        <div className="filter-group filter-group-wide">
                                            <label className="filter-label">Ordenar per</label>
                                            <select className="filter-select filter-select-standard" value={analisiSort} onChange={(e) => setAnalisiSort(e.target.value)} aria-label="Ordenar casos d'electoralisme per">
                                                <option value="risk-desc">Puntuació de risc (descendent)</option>
                                                <option value="risk-asc">Puntuació de risc (ascendent)</option>
                                                <option value="amount-desc">Import (descendent)</option>
                                                <option value="amount-asc">Import (ascendent)</option>
                                                <option value="date-desc">Data (més recents)</option>
                                                <option value="date-asc">Data (més antics)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="results-count" role="status" aria-live="polite">
                                    <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{electoralFiltrats.length}</strong> alertes</span>
                                    {electoralFiltrats.length > analisiItemsPerPage && (
                                        <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{analisiPageElect}</strong> de <strong>{totalPagesElect}</strong></span>
                                    )}
                                </div>

                                <div className="analisi-alert-list">
                                    {electoralPaginats.map(caso => {
                                        const cc = (caso.contractes && caso.contractes[0]) || {};
                                        const href = buildRouteUrl(`/analisi/electoralisme/${caso.id}`);
                                        return (
                                            <a key={caso.id} href={href} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => handleElectoralismeClick(caso))}>
                                                <div className="contract-card analysis-list-card electoralisme-card">
                                                    <div className="contract-header">
                                                        <div className="contract-title">{caso.empresa}</div>
                                                        <div className="contract-amount">{formatCurrency(caso.import_total)}</div>
                                                    </div>
                                                    <div className="contract-meta analysis-list-meta">
                                                        <div className="contract-meta-item analysis-list-primary analysis-list-primary-long">
                                                            <span className="contract-meta-label">Objecte</span>
                                                            <span className="contract-meta-value">{cc.descripcion || ''}</span>
                                                        </div>
                                                        <div className="contract-pills">
                                                            <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                                                            <span className={"risk-badge " + riskClass(caso.nivell)}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>

                                {electoralFiltrats.length === 0 && (
                                    <EmptySearchState text="No s'han trobat alertes d'electoralisme." onReset={resetAnalisiFilters} />
                                )}

                                {electoralFiltrats.length > analisiItemsPerPage && (
                                    <Pagination
                                        currentPage={analisiPageElect}
                                        totalPages={totalPagesElect}
                                        onPageChange={setAnalisiPageElect}
                                    />
                                )}
                            </>
                        )}

                        {analisiTab === 'dependencia' && (
                            <>
                                <div className="metodologia-wrapper">
                                    <div className="metodologia">
                                        <h3 className="metodologia-title">Metodologia</h3>
                                        <p className="metodologia-intro">L'algoritme Iguadata de dependència detecta entitats que acumulen subvencions directes o les reben de manera recurrent al llarg del temps. La identificació de patrons estadísticament rellevants i les alertes generades no impliquen cap irregularitat legal confirmada i han de ser interpretades en context.</p>
                                        <div className="metodologia-steps-compact">
                                            <div className="metodologia-step-compact"><span className="metodologia-step-num-compact">01</span><span className="metodologia-step-text-compact">Identificació de subvencions definides com a directes</span></div>
                                            <div className="metodologia-step-compact"><span className="metodologia-step-num-compact">02</span><span className="metodologia-step-text-compact">Agrupació per entitat i any per mesurar recurrència, continuïtat i acumulació</span></div>
                                            <div className="metodologia-step-compact"><span className="metodologia-step-num-compact">03</span><span className="metodologia-step-text-compact">Puntuació i classificació visual segons el nivell de risc</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="search-section analisi-search-section">
                                    <SearchField value={analisiSearch} onValueChange={setAnalisiSearch} placeholder="Cerca per descripció, entitat o codi de cas" ariaLabel="Cerca casos de dependència" />
                                    <FilterActions open={analisiFiltersOpen} onToggle={() => setAnalisiFiltersOpen(prev => !prev)} activeCount={activeAnalisiFiltersCount} onReset={resetAnalisiFilters} controlsId="analisi-filter-panel-dependencia" />
                                    <div id="analisi-filter-panel-dependencia" className={"filters search-filter-panel search-filter-panel-analysis" + (!analisiFiltersOpen ? " collapsed" : "")}>
                                        <div className="filter-group filter-group-wide">
                                            <label className="filter-label">Ordenar per</label>
                                            <select className="filter-select filter-select-standard" value={analisiSort} onChange={(event) => setAnalisiSort(event.target.value)} aria-label="Ordenar casos de dependència per">
                                                <option value="risk-desc">Puntuació de risc (descendent)</option>
                                                <option value="risk-asc">Puntuació de risc (ascendent)</option>
                                                <option value="amount-desc">Import (descendent)</option>
                                                <option value="amount-asc">Import (ascendent)</option>
                                                <option value="date-desc">Data (més recents)</option>
                                                <option value="date-asc">Data (més antics)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="results-count" role="status" aria-live="polite">
                                    <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{dependenciaFiltrada.length}</strong> alertes</span>
                                    {dependenciaFiltrada.length > analisiItemsPerPage && <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{analisiPageDependencia}</strong> de <strong>{totalPagesDependencia}</strong></span>}
                                </div>

                                <div className="analisi-alert-list">
                                    {dependenciaPaginada.map(caso => (
                                        <a key={caso.id} href={buildRouteUrl(`/analisi/dependencia/${caso.id}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => handleDependenciaClick(caso))}>
                                            <div className="contract-card analysis-list-card dependencia-card">
                                                <div className="contract-header"><div className="contract-title">{caso.entitat}</div><div className="contract-amount">{formatCurrency(caso.import_total)}</div></div>
                                                <div className="contract-meta analysis-list-meta">
                                                    <div className="contract-meta-item analysis-list-primary"><span className="contract-meta-label">Acumulació</span><span className="contract-meta-value">{caso.num_subvencions} subvencions directes</span></div>
                                                    <div className="contract-meta-item analysis-list-secondary"><span className="contract-meta-label">Període</span><span className="contract-meta-value">Del {formatDate(caso.data_inici)} al {formatDate(caso.data_fi)}</span></div>
                                                    <div className="contract-pills"><span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span><span className={"risk-badge " + riskClass(caso.nivell)}>{caso.risc}/100</span></div>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>

                                {dependenciaFiltrada.length === 0 && <EmptySearchState text="No s'han trobat alertes de dependència." onReset={resetAnalisiFilters} />}
                                {dependenciaFiltrada.length > analisiItemsPerPage && <Pagination currentPage={analisiPageDependencia} totalPages={totalPagesDependencia} onPageChange={setAnalisiPageDependencia} />}
                            </>
                        )}
                    </div>
                </>
            )
            }

            {activeTab === 'sobre' && <SobreView />}

            {activeTab === 'legal' && <LegalView />}

                </main>
            )}

            {
                activeTab !== 'home' && (
                    <button
                        type="button"
                        className={`btn-reset contracte-detail-back mobile-scroll-top${showMobileScrollTop ? ' is-visible' : ''}`}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        title="Tornar a dalt"
                        aria-label="Tornar a dalt"
                        aria-hidden={!showMobileScrollTop}
                        tabIndex={showMobileScrollTop ? 0 : -1}
                    >
                        <svg className="mobile-scroll-top-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                    </button>
                )
            }

            {
                activeTab !== 'home' && (
                    <footer className="footer">
                        <div className={`footer-content${activeTab === 'sobre' || activeTab === 'legal' || activeTab === 'cas-investigacio' ? ' footer-content-prose' : ''}`}>
                            <div className="footer-main">
                                <div className="footer-brand">
                                    <a href={BASE + '/'} onClick={(e) => { e.preventDefault(); handleNavigation('home'); }} className="footer-logo-link" aria-label={`${BRAND_NAME}, inici`}>
                                        <img src={assetUrl('/assets/iguadata.svg')} alt={BRAND_NAME} className="footer-logo" />
                                    </a>
                                    <p className="footer-tagline">{BRAND_TAGLINE}</p>
                                    <div className="footer-social">
                                        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label={`${BRAND_NAME} a Instagram`}>
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <rect x="3" y="3" width="18" height="18" rx="5" />
                                                <circle cx="12" cy="12" r="4" />
                                                <circle cx="17.5" cy="6.5" r="1" className="footer-social-fill" />
                                            </svg>
                                        </a>
                                        <a href={`mailto:${CONTACT_EMAIL}`} className="footer-social-link" aria-label={`Escriu a ${BRAND_NAME}`}>
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                                <path d="m4 7 8 6 8-6" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>

                                <nav className="footer-nav" aria-label="Navegació del peu de pàgina">
                                    <div className="footer-nav-column">
                                        <a href={BASE + '/contractes'} onClick={(e) => { e.preventDefault(); handleNavigation('buscador'); }} className="footer-link">Contractes</a>
                                        <a href={BASE + '/empreses'} onClick={(e) => { e.preventDefault(); handleNavigation('empreses'); }} className="footer-link">Empreses</a>
                                        <a href={BASE + '/persones'} onClick={(e) => { e.preventDefault(); handleNavigation('persones'); }} className="footer-link">Persones</a>
                                        <a href={BASE + '/subvencions'} onClick={(e) => { e.preventDefault(); handleNavigation('subvencions'); }} className="footer-link">Subvencions</a>
                                        <a href={BASE + '/analisi'} onClick={(e) => { e.preventDefault(); handleNavigation('analisi'); }} className="footer-link">Anàlisi</a>
                                    </div>
                                    <div className="footer-nav-column">
                                        <a href={BASE + '/investigacio'} onClick={(e) => { e.preventDefault(); handleNavigation('casos'); }} className="footer-link">Investigació</a>
                                        <a href={BASE + '/sobre'} onClick={(e) => { e.preventDefault(); handleNavigation('sobre'); }} className="footer-link">Sobre</a>
                                        <a href={BASE + '/avis-legal'} onClick={(e) => { e.preventDefault(); handleNavigation('legal'); }} className="footer-link">Avís legal</a>
                                        <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="footer-link">Codi obert</a>
                                        <a href={`mailto:${CONTACT_EMAIL}`} className="footer-link">Contacte</a>
                                    </div>
                                </nav>
                            </div>

                            <div className="footer-copyright">© 2026 {BRAND_NAME}. Tots els drets reservats.</div>
                        </div>
                    </footer>
                )
            }
            {homeMetricTransition && (
                <div
                    className={`home-metric-transition ${homeMetricTransition.phase || 'is-expanding'}`}
                    style={{
                        '--metric-transition-x': `${homeMetricTransition.x}px`,
                        '--metric-transition-y': `${homeMetricTransition.y}px`
                    }}
                    aria-hidden="true"
                ></div>
            )}
            {homeRouteTransition && <div className={`route-transition route-transition-navy ${homeRouteTransition}`} aria-hidden="true"></div>}
        </div >
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
