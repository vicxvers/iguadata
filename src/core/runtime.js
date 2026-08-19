// En GitHub Pages el projecte es serveix sota /iguadata-dev/. En localhost, sense prefix.
const BASE = window.__IGUADATA_BASE__ || '';
const assetUrl = path => `${BASE}${path}`;
const BRAND_NAME = PROJECT_CONFIG.brand.name;
const BRAND_TAGLINE = PROJECT_CONFIG.brand.tagline;
const AUTHORITY_NAME = PROJECT_CONFIG.municipality.authorityName;
const CONTACT_EMAIL = PROJECT_CONFIG.site.contactEmail;
const REPOSITORY_URL = PROJECT_CONFIG.site.repositoryUrl;
const INSTAGRAM_URL = PROJECT_CONFIG.site.instagramUrl || '';

let DATA_VERSION = '';
const setDataVersion = version => { DATA_VERSION = version || ''; };
const jsonAssetUrl = path => {
    const suffix = DATA_VERSION ? `?v=${encodeURIComponent(DATA_VERSION)}` : '';
    return `${assetUrl(path)}${suffix}`;
};

let threeLoaderPromise = null;
function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (threeLoaderPromise) return threeLoaderPromise;
    threeLoaderPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = assetUrl('/assets/vendor/three.min.js');
        script.async = true;
        script.onload = () => resolve(window.THREE);
        script.onerror = reject;
        document.head.appendChild(script);
    });
    return threeLoaderPromise;
}

const buildRouteUrl = path => `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

function isPlainLeftClick(event) {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function handleInternalLinkClick(event, navigate) {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    navigate();
}

function getCurrentRoute() {
    let path = window.location.pathname;
    if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
    if (!path.startsWith('/')) path = `/${path}`;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path;
}

function resolveRoute(path) {
    if (path === '/') return { tab: 'home', canonicalPath: '/' };
    if (path === '/contractes') return { tab: 'buscador', canonicalPath: '/contractes' };
    if (path === '/empreses') return { tab: 'empreses', canonicalPath: '/empreses' };
    if (path === '/persones') return { tab: 'persones', canonicalPath: '/persones' };
    if (path === '/subvencions') return { tab: 'subvencions', canonicalPath: '/subvencions' };
    if (path.startsWith('/entitats/')) return { tab: 'entitat', canonicalPath: path };
    if (path === '/analisi') return { tab: 'analisi', canonicalPath: '/analisi' };
    if (path === '/investigacio') return { tab: 'casos', canonicalPath: '/investigacio' };
    if (path.startsWith('/investigacio/')) return { tab: 'cas-investigacio', canonicalPath: path };
    if (path === '/sobre') return { tab: 'sobre', canonicalPath: '/sobre' };
    if (path === '/avis-legal') return { tab: 'legal', canonicalPath: '/avis-legal' };
    if (path.startsWith('/contractes/')) return { tab: 'contracte', canonicalPath: path };
    if (path.startsWith('/empreses/')) return { tab: 'empresa', canonicalPath: path };
    if (path.startsWith('/analisi/fraccionament/')) return { tab: 'cas-fraccionament', canonicalPath: path };
    if (path.startsWith('/analisi/concentracio/')) return { tab: 'cas-concentracio', canonicalPath: path };
    if (path.startsWith('/analisi/electoralisme/')) return { tab: 'cas-electoralisme', canonicalPath: path };
    if (path.startsWith('/analisi/dependencia/')) return { tab: 'cas-dependencia', canonicalPath: path };
    return { tab: 'home', canonicalPath: '/' };
}

const CONTRACT_SEARCH_DEFAULTS = {
    searchTerm: '',
    typeFilter: '',
    procedureFilter: '',
    dateStart: '',
    dateEnd: '',
    amountMin: '',
    amountMax: '',
    sortBy: 'date-desc',
    currentPage: 1,
};

const CONTRACT_TYPE_QUERY_VALUES = {
    '1. OBRES': 'obres',
    '2. GESTIÓ DE SERVEI PÚBLIC': 'gestio-servei-public',
    '3. SUBMINISTRAMENTS': 'subministraments',
    '5. SERVEIS': 'serveis',
    '6. ADMINISTRATIU ESPECIAL': 'administratiu-especial',
    '8. CONCESSIÓ DE SERVEIS': 'concessio-serveis',
    "10. PRIVAT D'ADMINISTRACIO PUBLICA": 'privat-administracio-publica',
};

const CONTRACT_PROCEDURE_QUERY_VALUES = {
    'Menor': 'menor',
    'Obert': 'obert',
    'Negociat sense publicitat': 'negociat-sense-publicitat',
    'Licitació amb negociació': 'licitacio-amb-negociacio',
    'Adjudicacions directes no menors': 'adjudicacio-directa',
    'Específic de sistema dinàmic de contractació': 'sistema-dinamic',
};

const CONTRACT_SORT_QUERY_VALUES = {
    'date-desc': 'data-recents',
    'date-asc': 'data-antics',
    'amount-desc': 'import-descendent',
    'amount-asc': 'import-ascendent',
};

function readMappedQueryValue(value, mapping, fallback = '') {
    if (!value) return fallback;
    if (Object.hasOwn(mapping, value)) return value;
    return Object.keys(mapping).find(key => mapping[key] === value) || fallback;
}

function readContractSearchState(search = window.location.search) {
    const params = new URLSearchParams(search);
    const requestedPage = Number.parseInt(params.get('pagina') || '1', 10);
    return {
        searchTerm: params.get('cerca') || '',
        typeFilter: readMappedQueryValue(params.get('tipus'), CONTRACT_TYPE_QUERY_VALUES),
        procedureFilter: readMappedQueryValue(params.get('procediment'), CONTRACT_PROCEDURE_QUERY_VALUES),
        dateStart: params.get('data_inici') || '',
        dateEnd: params.get('data_final') || '',
        amountMin: params.get('import_min') || '',
        amountMax: params.get('import_max') || '',
        sortBy: readMappedQueryValue(params.get('ordre'), CONTRACT_SORT_QUERY_VALUES, CONTRACT_SEARCH_DEFAULTS.sortBy),
        currentPage: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    };
}

function buildContractSearchParams(state) {
    const params = new URLSearchParams();
    if (state.searchTerm.trim()) params.set('cerca', state.searchTerm.trim());
    if (state.typeFilter) params.set('tipus', CONTRACT_TYPE_QUERY_VALUES[state.typeFilter] || state.typeFilter);
    if (state.procedureFilter) params.set('procediment', CONTRACT_PROCEDURE_QUERY_VALUES[state.procedureFilter] || state.procedureFilter);
    if (state.dateStart) params.set('data_inici', state.dateStart);
    if (state.dateEnd) params.set('data_final', state.dateEnd);
    if (state.amountMin !== '') params.set('import_min', state.amountMin);
    if (state.amountMax !== '') params.set('import_max', state.amountMax);
    if (state.sortBy !== CONTRACT_SEARCH_DEFAULTS.sortBy) params.set('ordre', CONTRACT_SORT_QUERY_VALUES[state.sortBy] || state.sortBy);
    if (state.currentPage > 1) params.set('pagina', String(state.currentPage));
    return params.toString();
}

const ANALYSIS_SEARCH_DEFAULTS = {
    tab: 'fraccionament',
    concentrationMode: 'temporal',
    searchTerm: '',
    sortBy: 'risk-desc',
    currentPage: 1,
};

const ANALYSIS_TAB_QUERY_VALUES = {
    fraccionament: 'fraccionament',
    monopoli: 'concentracio',
    electoral: 'electoralisme',
    dependencia: 'dependencia',
};

const ANALYSIS_MODE_QUERY_VALUES = {
    historic: 'sectors',
    temporal: 'temporals',
};

const ANALYSIS_SORT_QUERY_VALUES = {
    'risk-desc': 'risc-descendent',
    'risk-asc': 'risc-ascendent',
    'amount-desc': 'import-descendent',
    'amount-asc': 'import-ascendent',
    'date-desc': 'data-recents',
    'date-asc': 'data-antics',
};

function readAnalysisSearchState(search = window.location.search) {
    const params = new URLSearchParams(search);
    const requestedPage = Number.parseInt(params.get('pagina') || '1', 10);
    return {
        tab: readMappedQueryValue(params.get('tipus'), ANALYSIS_TAB_QUERY_VALUES, ANALYSIS_SEARCH_DEFAULTS.tab),
        concentrationMode: readMappedQueryValue(params.get('mode'), ANALYSIS_MODE_QUERY_VALUES, ANALYSIS_SEARCH_DEFAULTS.concentrationMode),
        searchTerm: params.get('cerca') || '',
        sortBy: readMappedQueryValue(params.get('ordre'), ANALYSIS_SORT_QUERY_VALUES, ANALYSIS_SEARCH_DEFAULTS.sortBy),
        currentPage: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    };
}

function buildAnalysisSearchParams(state) {
    const params = new URLSearchParams();
    if (state.tab !== ANALYSIS_SEARCH_DEFAULTS.tab) params.set('tipus', ANALYSIS_TAB_QUERY_VALUES[state.tab] || state.tab);
    if (state.tab === 'monopoli' && state.concentrationMode !== ANALYSIS_SEARCH_DEFAULTS.concentrationMode) {
        params.set('mode', ANALYSIS_MODE_QUERY_VALUES[state.concentrationMode] || state.concentrationMode);
    }
    if (state.searchTerm.trim()) params.set('cerca', state.searchTerm.trim());
    if (state.sortBy !== ANALYSIS_SEARCH_DEFAULTS.sortBy) params.set('ordre', ANALYSIS_SORT_QUERY_VALUES[state.sortBy] || state.sortBy);
    if (state.currentPage > 1) params.set('pagina', String(state.currentPage));
    return params.toString();
}

function formatPageTitle(value) {
    const trimmed = (value || '').trim();
    return trimmed ? `${trimmed} | ${BRAND_NAME}` : BRAND_NAME;
}
