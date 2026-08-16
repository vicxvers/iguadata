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
    return { tab: 'home', canonicalPath: '/' };
}

function formatPageTitle(value) {
    const trimmed = (value || '').trim();
    return trimmed ? `${trimmed} | ${BRAND_NAME}` : BRAND_NAME;
}
