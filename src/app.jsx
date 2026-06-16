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

/* ---- Routing: BASE path + slug helpers -------------------------- */
// En GH Pages el projecte es serveix sota /iguadata-dev/. En localhost, sense prefix.
const BASE = window.__IGUADATA_BASE__ || '';
const assetUrl = (path) => `${BASE}${path}`;
let DATA_VERSION = '';
const setDataVersion = (version) => { DATA_VERSION = version || ''; };
const jsonAssetUrl = (path) => {
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
const buildRouteUrl = (path) => `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

function isPlainLeftClick(event) {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function handleInternalLinkClick(event, navigate) {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    navigate();
}

function resolveRoute(path) {
    if (path === '/') return { tab: 'home', canonicalPath: '/' };
    if (path === '/contractes') return { tab: 'buscador', canonicalPath: '/contractes' };
    if (path === '/empreses') return { tab: 'empreses', canonicalPath: '/empreses' };
    if (path === '/persones') return { tab: 'persones', canonicalPath: '/persones' };
    if (path === '/analisi') return { tab: 'analisi', canonicalPath: '/analisi' };
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
    return trimmed ? `${trimmed} | Iguadata` : 'Iguadata';
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

function cpvToCategoria(cpvCode) {
    if (!cpvCode) return "Altres serveis comunitaris";
    const div = String(cpvCode).replace(/\D/g, '').substring(0, 2);
    return CPV_DIVISIONS[div] || "Altres serveis comunitaris";
}

function categoriaToSector(cat) {
    return SECTOR_MAPPING[cat] || "Altres Serveis i Subministraments";
}

/* ---- Socrata API ------------------------------------------------ */
const SOCRATA_BASE = "https://analisi.transparenciacatalunya.cat/resource/hb6v-jcbf.json";
// Token públic d'aplicació Socrata: no és un secret i queda exposat al navegador.
const SOCRATA_APP_TOKEN = "eolLs4uJArZvmZVTVUfJN8d3Y";
const SOCRATA_TIMEOUT_MS = 4500;
const SOCRATA_ORGANISMES = [
    "Ajuntament d'Igualada",
    "Igualada en Acció",
    "Consorci de Gestió Aeròdrom General Vives d'Igualada-Òdena",
    "Consorci per a la gestió de la televisió digital local de demarcació d'igualada",
    "Organisme Autònom Municipal d'Ensenyaments Artístics d'Igualada",
    "Terrenys Av. Catalunya d'Igualada, SA",
    "Consorci Sociosanitari d'Igualada",
    "Promotora Igualadina Municipal d'Habitatges, SL (PIMHA)",
    "Societat Igualadina Municipal d'Aparcaments, SL",
];

async function fetchAllContracts() {
    const select = [
        "situaci_contractual", "exercici", "organisme_contractant",
        "codi_expedient", "procediment_adjudicacio", "tipus_contracte",
        "descripcio_expedient", "adjudicatari", "import_adjudicacio",
        "data_adjudicacio", "codi_cpv"
    ].map(f => '`' + f + '`').join(', ');

    const orgList = SOCRATA_ORGANISMES.map(o => '"' + o + '"').join(', ');
    const where = `caseless_one_of(\`organisme_contractant\`, ${orgList}) AND caseless_one_of(\`situaci_contractual\`, "adjudicació", "menor")`;
    const order = [
        '`exercici` ASC NULL LAST',
        '`data_adjudicacio` ASC NULL LAST',
        '`codi_expedient` ASC NULL LAST',
        '`adjudicatari` ASC NULL LAST'
    ].join(', ');
    const LIMIT = 1000;

    let all = [];
    let offset = 0;
    while (true) {
        const params = new URLSearchParams({
            '$select': select,
            '$where': where,
            '$order': order,
            '$limit': LIMIT,
            '$offset': offset,
        });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SOCRATA_TIMEOUT_MS);
        const resp = await fetch(`${SOCRATA_BASE}?${params}`, {
            headers: { 'X-App-Token': SOCRATA_APP_TOKEN },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error(`Socrata HTTP ${resp.status}`);
        const page = await resp.json();
        all = all.concat(page);
        if (page.length < LIMIT) break;
        offset += LIMIT;
    }
    return all.sort((a, b) => {
        const da = a.data_adjudicacio || '';
        const db = b.data_adjudicacio || '';
        if (da !== db) return db.localeCompare(da);
        const ca = a.codi_expedient || '';
        const cb = b.codi_expedient || '';
        if (ca !== cb) return cb.localeCompare(ca);
        return (b.adjudicatari || '').localeCompare(a.adjudicatari || '');
    });
}

const CONTRACTS_CACHE_KEY = 'iguadata_contracts_cache_v2';

async function fetchStaticContractsBackup() {
    const data = await fetchStaticContractsSnapshot();
    return data.map(c => ({
        ...c,
        slug: c.slug || buildContractSlug(c),
        __iguadataInternalContract: true
    }));
}

async function fetchStaticContractsSnapshot() {
    const resp = await fetch(jsonAssetUrl('/json/contractes.json'));
    if (!resp.ok) throw new Error(`Backup contractes HTTP ${resp.status}`);
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
}

async function fetchArchivedContracts() {
    const resp = await fetch(jsonAssetUrl('/json/contractes_arxiu.json'));
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
}

async function fetchEmpresaAliases() {
    try {
        const resp = await fetch(jsonAssetUrl('/json/empresa_aliases.json'));
        if (!resp.ok) return { aliases: {} };
        const data = await resp.json();
        return data && data.aliases ? data : { aliases: {} };
    } catch (e) {
        return { aliases: {} };
    }
}

async function fetchAllContractsCached() {
    const today = new Date().toISOString().slice(0, 10);
    try {
        const raw = localStorage.getItem(CONTRACTS_CACHE_KEY);
        if (raw) {
            const cached = JSON.parse(raw);
            if (cached.date === today && Array.isArray(cached.data)) {
                return cached.data;
            }
        }
    } catch (e) { /* cache invàlid, ignorem */ }

    let data;
    try {
        data = await fetchAllContracts();
    } catch (err) {
        console.warn('Socrata no disponible, utilitzant backup JSON local:', err);
        return fetchStaticContractsBackup();
    }
    try {
        localStorage.setItem(CONTRACTS_CACHE_KEY, JSON.stringify({ date: today, data }));
    } catch (e) { /* quota excedida o mode privat, no bloquegem */ }
    return data;
}

function mapSocrataContract(row, id) {
    const importRaw = row.import_adjudicacio;
    const importe = (importRaw != null && importRaw !== '' && importRaw !== 'nan')
        ? parseFloat(importRaw) || 0 : 0;

    let fecha = '', mes = null;
    const dataRaw = row.data_adjudicacio || '';
    if (dataRaw) {
        const d = dataRaw.substring(0, 10);
        fecha = d;
        const m = parseInt(d.substring(5, 7), 10);
        if (!isNaN(m)) mes = m;
    }

    let año = row.exercici ? parseInt(row.exercici, 10) : null;
    if (año == null && fecha.length >= 4) {
        año = parseInt(fecha.substring(0, 4), 10) || null;
    }

    const c = {
        id,
        codigo: (row.codi_expedient || '').trim(),
        organismo: (row.organisme_contractant || '').trim(),
        tipo: (row.tipus_contracte || '').trim(),
        procedimiento: (row.procediment_adjudicacio || '').trim(),
        descripcion: (row.descripcio_expedient || '').trim(),
        importe,
        adjudicatario: (row.adjudicatari || '').trim().toUpperCase(),
        fecha,
        año,
        mes,
        cpv: (row.codi_cpv || '').trim(),
    };
    c.slug = buildContractSlug(c);
    return c;
}

function contractStableKey(c) {
    const norm = value => String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const amount = Number(c.importe || 0).toFixed(2);
    return [
        norm(c.codigo),
        norm(c.organismo),
        norm(c.fecha),
        amount,
        norm(c.adjudicatario),
        norm(c.descripcion).slice(0, 180)
    ].join('|');
}

function mergeArchivedContracts(contractsData, archiveRows) {
    const existing = new Set(contractsData.map(contractStableKey));
    let nextId = contractsData.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0);
    const merged = [...contractsData];
    for (const row of archiveRows || []) {
        const original = row && row.contracte_original;
        if (!original) continue;
        const preserved = {
            ...original,
            estat_font: 'preservat_desaparegut_socrata',
            preservat_iguadata: true,
            primera_absencia_detectada: row.primera_absencia_detectada || '',
            font_preservacio: row.font_preservacio || '',
            primer_snapshot_iguadata: row.primer_snapshot_iguadata || '',
        };
        const key = contractStableKey(preserved);
        if (existing.has(key)) continue;
        preserved.id = ++nextId;
        preserved.slug = buildContractSlug(preserved);
        merged.push(preserved);
        existing.add(key);
    }
    return merged.sort((a, b) => {
        if ((a.fecha || '') !== (b.fecha || '')) return (b.fecha || '').localeCompare(a.fecha || '');
        if ((a.codigo || '') !== (b.codigo || '')) return (b.codigo || '').localeCompare(a.codigo || '');
        return (b.adjudicatario || '').localeCompare(a.adjudicatario || '');
    }).map((c, i) => ({ ...c, id: i + 1 }));
}

function mergeMissingSnapshotContracts(contractsData, snapshotRows) {
    const existing = new Set(contractsData.map(contractStableKey));
    let nextId = contractsData.reduce((max, c) => Math.max(max, Number(c.id) || 0), 0);
    const merged = [...contractsData];
    for (const row of snapshotRows || []) {
        if (!row || existing.has(contractStableKey(row))) continue;
        const preserved = {
            ...row,
            estat_font: 'preservat_desaparegut_socrata',
            preservat_iguadata: true,
            font_preservacio: row.font_preservacio || 'json/contractes.json',
        };
        preserved.id = ++nextId;
        preserved.slug = buildContractSlug(preserved);
        merged.push(preserved);
        existing.add(contractStableKey(preserved));
    }
    return merged.sort((a, b) => {
        if ((a.fecha || '') !== (b.fecha || '')) return (b.fecha || '').localeCompare(a.fecha || '');
        if ((a.codigo || '') !== (b.codigo || '')) return (b.codigo || '').localeCompare(a.codigo || '');
        return (b.adjudicatario || '').localeCompare(a.adjudicatario || '');
    }).map((c, i) => ({ ...c, id: i + 1 }));
}

function buildEmpreses(contracts, existingEmpreses) {
    const existingByName = {};
    for (const e of existingEmpreses) {
        existingByName[e.nom.trim().toUpperCase()] = e;
    }

    const groups = {};
    for (const c of contracts) {
        const nom = c.adjudicatario;
        if (!nom) continue;
        if (!groups[nom]) groups[nom] = { ids: [], importe: 0, cpvs: [] };
        groups[nom].ids.push(c.id);
        groups[nom].importe += c.importe;
        if (c.cpv) groups[nom].cpvs.push(c.cpv);
    }

    const result = [];
    for (const [nom, data] of Object.entries(groups)) {
        const existing = existingByName[nom];
        let sector, categoria;
        if (existing && existing.sector && existing.categoria) {
            sector = existing.sector;
            categoria = existing.categoria;
        } else {
            // New company: derive from most frequent CPV code
            const cpvCount = {};
            for (const cpv of data.cpvs) {
                const div = String(cpv).replace(/\D/g, '').substring(0, 2);
                cpvCount[div] = (cpvCount[div] || 0) + 1;
            }
            const topCpv = Object.entries(cpvCount).sort((a, b) => b[1] - a[1])[0];
            categoria = topCpv ? (CPV_DIVISIONS[topCpv[0]] || "Altres serveis comunitaris") : "Altres serveis comunitaris";
            sector = categoriaToSector(categoria);
        }
        result.push({
            nom,
            num_contratos: data.ids.length,
            total_importe: Math.round(data.importe * 100) / 100,
            contratos: data.ids.sort((a, b) => a - b),
            sector,
            categoria,
        });
    }
    result.sort((a, b) => b.num_contratos - a.num_contratos);
    return result;
}

/* ---- generateShareImage ----------------------------------------- */
async function generateShareImage(contract) {
    const W = 1080, H = 1350;
    const PAD_L = 68;
    const PAD_TOP = 135;
    const PAD_BOT = 135;
    const BG = '#0d1f3c';
    const TEXT = '#f8fafc';
    const LABEL = 'rgba(248,250,252,0.65)';

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    function ls(size) { return `${(size * -0.025).toFixed(2)}px`; }

    const maxW = W - PAD_L * 2;

    // 1 - IMPORT
    const amountSize = 144;
    const amountBaseline = PAD_TOP + Math.round(amountSize * 0.72);
    const rawAmount = new Intl.NumberFormat('ca-ES', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(contract.importe);
    ctx.font = `400 ${amountSize}px 'Instrument Serif', serif`;
    ctx.fillStyle = TEXT;
    ctx.letterSpacing = ls(amountSize);
    ctx.fillText(rawAmount + '\u20ac', PAD_L, amountBaseline);

    // 2 - TÍTOL AMB AUTO-SHRINK
    const fieldsStartY = H * 0.635;
    const titleMaxBottom = fieldsStartY - 135;
    const titleGroupTop = amountBaseline + Math.round(amountSize * 0.22) + 68;

    function getTitleStartY(size) {
        return titleGroupTop + Math.round(size * 0.72);
    }
    function measureLastY(size) {
        const lh = Math.round(size * 1.125);
        const startY = getTitleStartY(size);
        ctx.font = `500 ${size}px 'Instrument Sans', sans-serif`;
        ctx.letterSpacing = ls(size);
        const words = contract.descripcion.split(' ');
        let line = '', curY = startY;
        for (const w of words) {
            const t = line ? line + ' ' + w : w;
            if (ctx.measureText(t).width > maxW && line) { line = w; curY += lh; }
            else { line = t; }
        }
        return curY;
    }

    let fontSize = 64;
    while (fontSize >= 28 && measureLastY(fontSize) > titleMaxBottom) { fontSize -= 4; }
    const lineH = Math.round(fontSize * 1.125);
    const titleStartY = getTitleStartY(fontSize);

    ctx.font = `500 ${fontSize}px 'Instrument Sans', sans-serif`;
    ctx.fillStyle = TEXT;
    ctx.letterSpacing = ls(fontSize);
    const titleWords = contract.descripcion.split(' ');
    let tLine = '', tY = titleStartY;
    for (const w of titleWords) {
        const t = tLine ? tLine + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && tLine) {
            ctx.fillText(tLine, PAD_L, tY);
            tLine = w; tY += lineH;
        } else { tLine = t; }
    }
    if (tLine) ctx.fillText(tLine, PAD_L, tY);

    // 3 - CAMPS EN 2 COLUMNES
    const fields = [
        { label: 'CONTRACTANT', value: contract.organismo },
        { label: 'TIPUS DE CONTRACTE', value: formatTipus(contract.tipo) },
        { label: 'PROCEDIMENT', value: (contract.procedimiento && contract.procedimiento !== 'nan') ? formatProcediment(contract.procedimiento) : '\u2014' },
        { label: "DATA D'ADJUDICACI\u00d3", value: formatDate(contract.fecha) },
    ];
    const colW = maxW / 2;
    const rowH = 185;

    function drawLabel(text, x, sy) {
        const lbSize = 28, lbLineH = 38, lbMaxW = colW - 40;
        ctx.font = `600 ${lbSize}px 'Zalando Sans Expanded', sans-serif`;
        ctx.fillStyle = LABEL;
        ctx.letterSpacing = ls(lbSize);
        const ws = text.split(' ');
        let l = '', ly = sy;
        for (const w of ws) {
            const t = l ? l + ' ' + w : w;
            if (ctx.measureText(t).width > lbMaxW && l) {
                ctx.fillText(l, x, ly); l = w; ly += lbLineH;
            } else { l = t; }
        }
        if (l) ctx.fillText(l, x, ly);
        return ly;
    }

    fields.forEach((f, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = PAD_L + col * colW;
        const fy = fieldsStartY + row * rowH;
        const labelEndY = drawLabel(f.label, x, fy);
        const valMaxW = colW - 40;
        let val = f.value || '\u2014';
        ctx.font = `400 32px 'Instrument Sans', sans-serif`;
        ctx.fillStyle = TEXT;
        ctx.letterSpacing = ls(32);
        while (ctx.measureText(val).width > valMaxW && val.length > 5) {
            val = val.slice(0, -4) + '\u2026';
        }
        ctx.fillText(val, x, labelEndY + 48);
    });

    // 4 - LOGO
    const logoHeight = 72;
    const logoWidth = 216; // 3:1 aspect ratio
    const img = new Image();
    img.src = assetUrl('/assets/iguadata.svg');
    await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
    });
    if (img.complete && img.naturalWidth > 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = logoWidth;
        tempCanvas.height = logoHeight;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(img, 0, 0, logoWidth, logoHeight);
        tCtx.globalCompositeOperation = 'source-in';
        tCtx.fillStyle = TEXT;
        tCtx.fillRect(0, 0, logoWidth, logoHeight);
        ctx.drawImage(tempCanvas, PAD_L, H - PAD_BOT - logoHeight + 20);
    }

    // Descarregar
    const link = document.createElement('a');
    link.download = `iguadata-${contract.slug || buildContractSlug(contract)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

/* ---- ContractDetailView ----------------------------------------- */
function ContractDetailView({ contract: c, contracts, empreses, onBack, onEmpresaClick }) {
    const empresaContracts = useMemo(() =>
        contracts.filter(contract => contract.adjudicatario === c.adjudicatario)
        , [contracts, c.adjudicatario]);
    const isPreserved = c.estat_font === 'preservat_desaparegut_socrata' || c.preservat_iguadata;

    return (
        <div className="container contracte-detail-page">
            <button onClick={onBack} className="btn-reset contracte-detail-back" style={{ marginBottom: '1.25rem' }} title="Tornar">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>
            <div className="contracte-detail-hero">
                <div className="contracte-detail-amount">{formatCurrency(c.importe)}</div>
                <div className="contract-header contracte-detail-title-row">
                    <h1 className="contracte-detail-title">{c.descripcion}</h1>
                </div>
                {isPreserved && (
                    <div className="contracte-preserved-notice">
                        Aquest contracte ha estat eliminat de la base de dades oficial, però Iguadata conserva la seva fitxa per mantenir la traçabilitat de les dades.
                    </div>
                )}
                <div className="contract-meta contracte-detail-meta">
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Data</span>
                        <span className="contract-meta-value">{formatDate(c.fecha)}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Codi expedient</span>
                        <span className="contract-meta-value">{c.codigo}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Contractant</span>
                        <span className="contract-meta-value">{c.organismo}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Tipus</span>
                        <span className="contract-meta-value">{formatTipus(c.tipo)}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Procediment</span>
                        <span className="contract-meta-value">{formatProcediment(c.procedimiento)}</span>
                    </div>
                </div>
                <div className="contracte-detail-share">
                    <button
                        className="btn-share contracte-detail-share-btn"
                        onClick={() => generateShareImage(c)}
                    >
                        Compartir <em className="share-arrow"></em>
                    </button>
                </div>
            </div>
            <div className="contracte-detail-company-card">
                <div className="contract-meta-label" style={{ marginBottom: '0.75rem' }}>
                    Empresa adjudicatària
                </div>
                <div className="contract-header contracte-detail-company-row">
                    <h2
                        className="contracte-detail-company-title"
                        onClick={() => onEmpresaClick(c.adjudicatario)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onEmpresaClick(c.adjudicatario);
                            }
                        }}
                        role="link"
                        tabIndex={0}
                    >
                        {c.adjudicatario}
                    </h2>
                    <div className="contract-pills contracte-detail-company-pills">
                        <button className="contract-pill contract-pill-button" onClick={() => onEmpresaClick(c.adjudicatario)}>
                            {empresaContracts.length} contractes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---- CasoModal -------------------------------------------------- */
function CasoModal({ caso, onClose }) {
    const closeButtonRef = useRef(null);
    useEffect(() => {
        const previousFocus = document.activeElement;
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => closeButtonRef.current?.focus());
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
            previousFocus?.focus?.();
        };
    }, [onClose]);
    const rc = riskClass(caso.nivel_riesgo);
    const pct = caso.umbral > 0 ? (caso.importe_total / caso.umbral) * 100 : 0;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Detall de ${caso.empresa}`}>
                <div className="modal-header">
                    <div className="modal-header-top">
                        <button ref={closeButtonRef} className="modal-close" onClick={onClose} type="button" aria-label="Tancar">?</button>
                    </div>
                    <span className={"risk-badge modal-risk-badge " + rc}>
                        {riskLabel(caso.nivel_riesgo)}
                    </span>
                    <div className="modal-amount">{formatCurrency(caso.importe_total)}</div>
                    <div className="modal-empresa">{caso.empresa}</div>
                    <div className="modal-data">{caso.año} · {caso.tipo}</div>
                </div>
            </div>
            <div className="modal-body">
                <div className="caso-hero">
                    <div className="contract-meta-label">
                        Import adjudicat / Llindar legal (contractes menors)
                    </div>
                    <div className="caso-hero-amount">
                        {formatCurrency(caso.importe_total)}{' '}
                        <span className="caso-hero-limit">
                            / {formatCurrency(caso.umbral)}
                        </span>
                    </div>
                </div>
                <div className="caso-bar-row">
                    <div className="caso-bar-label">Concentració sobre límit</div>
                    <div className="caso-bar-bg">
                        <div
                            className={"caso-bar-fill" + (pct > 100 ? ' error' : ' navy')}
                            style={{ width: Math.min(pct, 100) + '%' }}
                        ></div>
                    </div>
                    <div className="caso-bar-pct">{Math.round(pct)}%</div>
                </div>
                <div className="modal-grid" style={{ marginTop: '1.5rem' }}>
                    <div>
                        <div className="contract-meta-label">Nombre de contractes</div>
                        <div className="contract-meta-value">{caso.num_contratos}</div>
                    </div>
                    <div>
                        <div className="contract-meta-label">Similitud mitjana</div>
                        <div className="contract-meta-value">{Math.round(caso.similitud_media * 100)}%</div>
                    </div>
                    <div>
                        <div className="contract-meta-label">Dies entre primer i últim</div>
                        <div className="contract-meta-value">{caso.dias_entre_contratos}</div>
                    </div>
                    <div>
                        <div className="contract-meta-label">Excés sobre llindar</div>
                        <div className="contract-meta-value">{formatCurrency(caso.exceso)}</div>
                    </div>
                </div>
                {caso.contratos_detalles && caso.contratos_detalles.length > 0 && (
                    <>
                        <h3 className="caso-detail-heading">
                            Contractes detectats ({caso.contratos_detalles.length})
                        </h3>
                        {caso.contratos_detalles.map((c, i) => (
                            <div key={i} className="contract-card" style={{ marginBottom: '0.75rem' }}>
                                <div className="contract-header">
                                    <div className="contract-title">{c.descripcion}</div>
                                    <div className="contract-amount">{formatCurrency(c.importe)}</div>
                                </div>
                                <div className="contract-meta">
                                    <div className="contract-meta-item">
                                        <span className="contract-meta-label">Data</span>
                                        <span className="contract-meta-value">{formatDate(c.fecha)}</span>
                                    </div>
                                    <div className="contract-meta-item">
                                        <span className="contract-meta-label">Codi</span>
                                        <span className="contract-meta-value">{c.codigo}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

/* ---- CasFraccionamentView ---------------------------------------- */
function CasFraccionamentView({ caso, contracts, empreses, onBack, onContractSelect, onEmpresaClick }) {
    if (!caso) return null;
    const pct = caso.limit_legal > 0 ? (caso.import_total / caso.limit_legal) * 100 : 0;
    const overLimit = pct > 100;
    const limitShare = overLimit && caso.import_total > 0 ? (caso.limit_legal / caso.import_total) * 100 : Math.min(pct, 100);
    const overShare = overLimit ? 100 - limitShare : 0;
    const sepStyle = { marginTop: '1.25rem', paddingTop: '1.75rem', borderTop: '1px solid var(--border-on-dark)' };
    const itemsPerPage = 25;
    const [currentPage, setCurrentPage] = useState(1);

    const casContracts = useMemo(() =>
        (caso.contractes || []).map(cc => {
            const full = findMatchingContract(contracts, cc);
            return { ...cc, slug: full ? full.slug : buildContractSlug(cc), fullObj: full || cc };
        })
        , [caso, contracts]);
    const isSingleContractAlert = casContracts.length === 1 || caso.tipus_alerta === 'contracte_proper_limit';

    const totalPages = Math.ceil(casContracts.length / itemsPerPage);
    const contractesPaginats = casContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="container analisi-detail-page">
            <button onClick={onBack} className="btn-reset analisi-detail-back" style={{ marginBottom: '1.25rem' }} title="Tornar">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>

            {/* -- Hero — idèntic a EmpresaView -- */}
            <div className="analisi-detail-hero analisi-case-hero analisi-case-fraccionament">
                <div className="contract-pills analisi-mobile-risk-pills">
                    <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                    <span className={"risk-badge " + riskClass(caso.nivell)} style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                </div>

                {/* Nom + import — exactament com empresa */}
                <div className="contract-header analisi-case-header">
                    <div className="analisi-case-title-wrap">
                        {(caso.empreses || []).map((nom, i) => {
                            const emp = empreses.find(e => e.nom === nom);
                            const slug = emp ? emp.slug : buildEmpresaSlug(nom);
                            return (
                                <a key={i} href={buildRouteUrl(`/empreses/${slug}`)}
                                    onClick={(event) => handleInternalLinkClick(event, () => onEmpresaClick(nom))}
                                    className="analisi-case-title-link">
                                    {nom}
                                </a>
                            );
                        })}
                    </div>
                    <div className="analisi-case-amount">
                        {formatCurrency(caso.import_total)}
                    </div>
                </div>

                {/* Meta — exactament com empresa: items + pills de risc a la dreta */}
                <div className="contract-meta divider-on-dark">
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">{isSingleContractAlert ? 'Contracte' : 'Contractes'}</span>
                        <span className="contract-meta-value">{casContracts.length}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">{isSingleContractAlert ? 'Import' : 'Similitud'}</span>
                        <span className="contract-meta-value">{isSingleContractAlert ? `${Math.round(pct)}% límit` : `${Math.round((caso.similitud_objecte || 0) * 100)}%`}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">{isSingleContractAlert ? 'Data' : 'Període'}</span>
                        <span className="contract-meta-value">{isSingleContractAlert ? formatDate(caso.data_inici) : `${caso.dies_entre_primer_i_ultim} dies`}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Tipus</span>
                        <span className="contract-meta-value">{formatTipusLimit(caso.tipus_limit)}</span>
                    </div>
                    <div className="contract-pills">
                        <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                        <span className={"risk-badge " + riskClass(caso.nivell)} style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                    </div>
                </div>

                {/* Barra de progrés — mateix patró que la secció admins */}
                <div className="analisi-case-section" style={sepStyle}>
                    <div className="contract-meta-label" style={{ marginBottom: '0.5rem' }}>
                        {isSingleContractAlert ? 'Import del contracte' : 'Import acumulat'}
                    </div>
                    <ul className="stack-list">
                        <li className="analisi-case-row">
                            <span className="analisi-case-row-strong">{formatCurrency(caso.import_total)} / {formatCurrency(caso.limit_legal)}</span>
                            <span className={overLimit ? 'analisi-case-row-danger' : 'analisi-case-row-strong'} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {overLimit ? `+${Math.round(pct)}% sobre el límit legal` : `${Math.round(pct)}% del límit legal`}
                            </span>
                        </li>
                    </ul>
                    <div className="analisi-case-progress">
                        <div className="analisi-case-progress-segment analisi-case-progress-limit" style={{ width: limitShare + '%' }}></div>
                        {overLimit && <div className="analisi-case-progress-segment analisi-case-progress-over" style={{ width: overShare + '%' }}></div>}
                    </div>
                </div>

                {/* Administradors comuns — exactament igual que admins empresa */}
                {(caso.administradors_comuns || []).length > 0 && (
                    <div className="analisi-case-section" style={sepStyle}>
                        <div className="contract-meta-label" style={{ marginBottom: '0.5rem' }}>
                            Administradors comuns
                        </div>
                        <ul className="stack-list">
                            {caso.administradors_comuns.map(a => (
                                <li key={a} className="analisi-case-row">
                                    <span style={{ fontWeight: 500 }}>{a}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Indicadors — exactament igual que admins empresa */}
                {(caso.motius || []).length > 0 && (
                    <div className="analisi-case-section" style={sepStyle}>
                        <div className="contract-meta-label" style={{ marginBottom: '0.5rem' }}>
                            Indicadors
                        </div>
                        <ul className="stack-list">
                            {caso.motius.map(m => (
                                <li key={m} className="analisi-case-row">
                                    <span style={{ fontWeight: 400 }}>{formatMotiuFraccionament(m)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* -- Contractes trobats -- */}
            {contractesPaginats.map((cc, i) => (
                cc.slug && cc.fullObj ? (
                    <a key={`${cc.codigo}-${i}`} href={buildRouteUrl(`/contractes/${cc.slug}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => onContractSelect(cc.fullObj))}>
                        <div className="contract-card">
                            <div className="contract-header">
                                <div className="contract-title">{cc.descripcion}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                    <div className="contract-amount">{formatCurrency(cc.importe)}</div>
                                </div>
                            </div>
                            <div className="contract-meta">
                                <div className="contract-meta-item"><span className="contract-meta-label">Empresa adjudicatària</span><span className="contract-meta-value">{cc.adjudicatario}</span></div>
                                <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(cc.fecha)}</span></div>
                                <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{cc.codigo}</span></div>
                            </div>
                        </div>
                    </a>
                ) : (
                    <div key={`${cc.codigo}-${i}`} className="contract-card">
                        <div className="contract-header">
                            <div className="contract-title">{cc.descripcion}</div>
                            <div className="contract-amount">{formatCurrency(cc.importe)}</div>
                        </div>
                        <div className="contract-meta">
                            <div className="contract-meta-item"><span className="contract-meta-label">Empresa adjudicatària</span><span className="contract-meta-value">{cc.adjudicatario}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(cc.fecha)}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{cc.codigo}</span></div>
                        </div>
                    </div>
                )
            ))}
            {casContracts.length > itemsPerPage && (
                <div className="pagination">
                    <button className="pagination-btn" onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1}>«</button>
                    <button className="pagination-btn" onClick={() => { setCurrentPage(p => Math.max(p - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1}>‹</button>
                    <span className="pagination-info">Pàgina <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
                    <button className="pagination-btn" onClick={() => { setCurrentPage(p => Math.min(p + 1, totalPages)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages}>›</button>
                    <button className="pagination-btn" onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages}>»</button>
                </div>
            )}
        </div>
    );
}

/* ---- CasConcentracioView ---------------------------------------- */
function CasConcentracioView({ caso, contracts, empreses, onBack, onContractSelect, onEmpresaClick }) {
    if (!caso) return null;
    const sepStyle = { marginTop: '1.25rem', paddingTop: '1.75rem', borderTop: '1px solid var(--border-on-dark)' };
    const itemsPerPage = 25;
    const [currentPage, setCurrentPage] = useState(1);
    const casContracts = useMemo(() =>
        (caso.contractes || []).map(cc => {
            const full = findMatchingContract(contracts, cc);
            return { ...cc, slug: full ? full.slug : buildContractSlug(cc), fullObj: full || cc };
        })
        , [caso, contracts]);
    const totalPages = Math.ceil(casContracts.length / itemsPerPage);
    const contractesPaginats = casContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const isHistoricConcentracio = caso.finestra === 'historic';
    const quotaPercent = Math.max(0, Math.min(100, Math.round((Number(caso.quota_import) || 0) * 100)));
    const quotaTone = quotaClass(caso.quota_import);

    return (
        <div className="container analisi-detail-page">
            <button onClick={onBack} className="btn-reset analisi-detail-back" style={{ marginBottom: '1.25rem' }} title="Tornar">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>
            <div className="analisi-detail-hero analisi-case-hero analisi-case-concentracio">
                {!isHistoricConcentracio && (
                    <div className="contract-pills analisi-mobile-risk-pills">
                        <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                        <span className={"risk-badge " + riskClass(caso.nivell)} style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                    </div>
                )}
                <div className="contract-header analisi-case-header">
                    <div className="analisi-case-title-wrap">
                        <div className="analisi-case-title">{formatSectorName(caso.sector)}</div>
                        <div className="label-on-dark analisi-case-subtitle">{isHistoricConcentracio ? 'Registre històric' : formatConcentracioPeriod(caso)}</div>
                    </div>
                </div>
                {isHistoricConcentracio ? (
                    <>
                        <div className="analisi-case-section" style={sepStyle}>
                            <div className="contract-meta-label" style={{ marginBottom: '0.75rem' }}>
                                {caso.tipus_concentracio === 'xarxa' ? 'Xarxa mercantil concentrada' : 'Empresa dominant'}
                            </div>
                            <ul className="stack-list">
                                {(caso.empreses || []).map(nom => {
                                    const emp = empreses.find(e => e.nom === nom);
                                    const slug = emp ? emp.slug : buildEmpresaSlug(nom);
                                    return (
                                        <li key={nom} className="analisi-case-company-item">
                                            <a href={buildRouteUrl(`/empreses/${slug}`)} onClick={(event) => handleInternalLinkClick(event, () => onEmpresaClick(nom))} className="analisi-case-company-link">{nom}</a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        <div className="analisi-case-section" style={sepStyle}>
                            <div className="contract-meta-label" style={{ marginBottom: '0.75rem' }}>Quota de mercat</div>
                            <div className={"analisi-case-quota analisi-case-quota-" + quotaTone}>{quotaPercent}%</div>
                            <div className="analisi-case-quota-bar">
                                <div className={"analisi-case-quota-fill analisi-case-quota-fill-" + quotaTone} style={{ width: `${quotaPercent}%` }} />
                            </div>
                        </div>
                        <div className="contract-meta divider-on-dark">
                            <div className="contract-meta-item"><span className="contract-meta-label">Import</span><span className="contract-meta-value">{formatCurrency(caso.import_concentrat)} / {formatCurrency(caso.import_sector)}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Contractes</span><span className="contract-meta-value">{caso.contractes_concentrats} / {caso.contractes_sector}</span></div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="analisi-case-section" style={sepStyle}>
                            <div className="contract-meta-label" style={{ marginBottom: '0.75rem' }}>
                                {caso.tipus_concentracio === 'xarxa' ? 'Xarxa mercantil concentrada' : 'Empresa dominant'}
                            </div>
                            <ul className="stack-list">
                                {(caso.empreses || []).map(nom => {
                                    const emp = empreses.find(e => e.nom === nom);
                                    const slug = emp ? emp.slug : buildEmpresaSlug(nom);
                                    return (
                                        <li key={nom} className="analisi-case-company-item">
                                            <a href={buildRouteUrl(`/empreses/${slug}`)} onClick={(event) => handleInternalLinkClick(event, () => onEmpresaClick(nom))} className="analisi-case-company-link">{nom}</a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        <div className="analisi-case-section" style={sepStyle}>
                            <div className="contract-meta-label" style={{ marginBottom: '0.75rem' }}>Quota de mercat</div>
                            <div className={"analisi-case-quota analisi-case-quota-" + quotaTone}>{quotaPercent}%</div>
                            <div className="analisi-case-quota-bar">
                                <div className={"analisi-case-quota-fill analisi-case-quota-fill-" + quotaTone} style={{ width: `${quotaPercent}%` }} />
                            </div>
                        </div>
                        <div className="contract-meta divider-on-dark">
                            <div className="contract-meta-item"><span className="contract-meta-label">Import</span><span className="contract-meta-value">{formatCurrency(caso.import_concentrat)} / {formatCurrency(caso.import_sector)}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Contractes</span><span className="contract-meta-value">{caso.contractes_concentrats} / {caso.contractes_sector}</span></div>
                            <div className="contract-pills">
                                <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                                <span className={"risk-badge " + riskClass(caso.nivell)} style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                            </div>
                        </div>
                    </>
                )}
                {(caso.administradors_comuns || []).length > 0 && (
                    <div className="analisi-case-section" style={sepStyle}>
                        <div className="contract-meta-label" style={{ marginBottom: '0.5rem' }}>Administradors comuns</div>
                        <ul className="stack-list">
                            {caso.administradors_comuns.map(a => <li key={a} className="analisi-case-section-value">{a}</li>)}
                        </ul>
                    </div>
                )}
                <div className="analisi-case-section" style={sepStyle}>
                    <div className="contract-meta-label" style={{ marginBottom: '0.5rem' }}>Indicadors</div>
                    <ul className="stack-list">
                        {(caso.motius || []).map(m => <li key={m} className="analisi-case-list-item">{m}</li>)}
                    </ul>
                </div>
            </div>

            {contractesPaginats.map((cc, i) => (
                cc.slug && cc.fullObj ? (
                    <a key={`${cc.codigo}-${i}`} href={buildRouteUrl(`/contractes/${cc.slug}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => onContractSelect(cc.fullObj))}>
                        <div className="contract-card">
                            <div className="contract-header"><div className="contract-title">{cc.descripcion}</div><div className="contract-amount">{formatCurrency(cc.importe)}</div></div>
                            <div className="contract-meta">
                                <div className="contract-meta-item"><span className="contract-meta-label">Empresa adjudicatària</span><span className="contract-meta-value">{cc.adjudicatario}</span></div>
                                <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(cc.fecha)}</span></div>
                                <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{cc.codigo}</span></div>
                            </div>
                        </div>
                    </a>
                ) : (
                    <div key={`${cc.codigo}-${i}`} className="contract-card">
                        <div className="contract-header"><div className="contract-title">{cc.descripcion}</div><div className="contract-amount">{formatCurrency(cc.importe)}</div></div>
                    </div>
                )
            ))}
            {casContracts.length > itemsPerPage && (
                <div className="pagination">
                    <button className="pagination-btn" onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1}>«</button>
                    <button className="pagination-btn" onClick={() => { setCurrentPage(p => Math.max(p - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1}>‹</button>
                    <span className="pagination-info">Pàgina <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
                    <button className="pagination-btn" onClick={() => { setCurrentPage(p => Math.min(p + 1, totalPages)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages}>›</button>
                    <button className="pagination-btn" onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages}>»</button>
                </div>
            )}
        </div>
    );
}

/* ---- CasElectoralismeView --------------------------------------- */
function CasElectoralismeView({ caso, contracts, empreses, onBack, onContractSelect, onEmpresaClick }) {
    if (!caso) return null;
    const sepStyle = { marginTop: '1.25rem', paddingTop: '1.75rem', borderTop: '1px solid var(--border-on-dark)' };
    const casContracts = useMemo(() =>
        (caso.contractes || []).map(cc => {
            const full = findMatchingContract(contracts, cc);
            return { ...cc, slug: full ? full.slug : buildContractSlug(cc), fullObj: full || cc };
        })
        , [caso, contracts]);
    const contracte = casContracts[0] || {};
    const recurrencia = caso.recurrencia || {};
    const empresaPrincipal = (caso.empreses && caso.empreses[0]) || caso.empresa || contracte.adjudicatario || '';
    const empresaPrincipalData = empreses.find(e => e.nom === empresaPrincipal);
    const empresaPrincipalSlug = empresaPrincipalData ? empresaPrincipalData.slug : buildEmpresaSlug(empresaPrincipal);
    const hasRecurrencia = (recurrencia.objecte_similar || 0) > 0;
    const termLabels = {
        campanya: 'campanya',
        comunicacio: 'comunicació',
        difusio: 'difusió',
        disseny: 'disseny',
        publicitat: 'publicitat',
        publicitaria: 'publicitària',
        video: 'vídeo',
        retolacio: 'retolació',
        impressio: 'impressió',
        promocio: 'promoció',
        inauguracio: 'inauguració',
        presentacio: 'presentació',
    };
    const conceptes = (caso.termes_detectats || []).map(t => termLabels[t] || t).join(', ');
    const conceptesText = conceptes ? conceptes.charAt(0).toUpperCase() + conceptes.slice(1) : '';
    const isPreElectoral = caso.fase_temporal === 'Finestra administrativa prèvia';
    const isPostElectoral = caso.fase_temporal === 'Finestra administrativa posterior';
    const temporalLabel = isPreElectoral ? 'Dies abans' : (isPostElectoral ? 'Dies després' : 'Votació en');
    const temporalValue = isPreElectoral ? (caso.dies_abans_convocatoria || 0) : (isPostElectoral ? (caso.dies_despres_votacio || 0) : caso.dies_fins_votacio);

    return (
        <div className="container analisi-detail-page">
            <button onClick={onBack} className="btn-reset analisi-detail-back" style={{ marginBottom: '1.25rem' }} title="Tornar">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>

            <div className="analisi-detail-hero analisi-case-hero analisi-case-electoralisme">
                <div className="contract-pills analisi-mobile-risk-pills">
                    <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                    <span className={"risk-badge " + riskClass(caso.nivell)} style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                </div>
                <div className="contract-header analisi-case-header">
                    <div className="analisi-case-title-wrap">
                        <a href={buildRouteUrl(`/empreses/${empresaPrincipalSlug}`)} onClick={(event) => handleInternalLinkClick(event, () => onEmpresaClick(empresaPrincipal))} className="analisi-case-title-link">{empresaPrincipal}</a>
                    </div>
                    <div className="analisi-case-amount">
                        {formatCurrency(caso.import_total)}
                    </div>
                </div>

                <div className="contract-meta divider-on-dark">
                    <div className="contract-meta-item"><span className="contract-meta-label">Període</span><span className="contract-meta-value">{caso.periode_electoral}</span></div>
                    <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(caso.data_inici)}</span></div>
                    <div className="contract-meta-item"><span className="contract-meta-label">{temporalLabel}</span><span className="contract-meta-value">{temporalValue} dies</span></div>
                    <div className="contract-meta-item"><span className="contract-meta-label">Contracte recurrent</span><span className="contract-meta-value">{hasRecurrencia ? 'Sí' : 'No'}</span></div>
                    <div className="contract-pills">
                        <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                        <span className={"risk-badge " + riskClass(caso.nivell)} style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                    </div>
                </div>

                {(caso.termes_detectats || []).length > 0 && (
                    <div className="analisi-case-section" style={sepStyle}>
                        <div className="contract-meta-label" style={{ marginBottom: '0.5rem' }}>Conceptes</div>
                        <div className="analisi-case-list-item">{conceptesText}</div>
                    </div>
                )}

                <div className="analisi-case-section" style={sepStyle}>
                    <div className="contract-meta-label" style={{ marginBottom: '0.5rem' }}>Indicadors</div>
                    <ul className="stack-list">
                        {(caso.motius || []).map(m => <li key={m} className="analisi-case-list-item">{m}</li>)}
                    </ul>
                </div>
            </div>

            {contracte.slug && contracte.fullObj ? (
                <a href={buildRouteUrl(`/contractes/${contracte.slug}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => onContractSelect(contracte.fullObj))}>
                    <div className="contract-card">
                        <div className="contract-header"><div className="contract-title">{contracte.descripcion}</div><div className="contract-amount">{formatCurrency(contracte.importe)}</div></div>
                        <div className="contract-meta">
                            <div className="contract-meta-item"><span className="contract-meta-label">Empresa adjudicatària</span><span className="contract-meta-value">{contracte.adjudicatario}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(contracte.fecha)}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{contracte.codigo}</span></div>
                        </div>
                    </div>
                </a>
            ) : (
                <div className="contract-card">
                    <div className="contract-header"><div className="contract-title">{contracte.descripcion}</div><div className="contract-amount">{formatCurrency(contracte.importe)}</div></div>
                </div>
            )}
        </div>
    );
}

function FilterActions({ open, onToggle, activeCount, onReset }) {
    return (
        <div className="filter-actions">
            <button
                className="filters-toggle-btn"
                onClick={onToggle}
                aria-expanded={open}
                type="button"
            >
                <span>Filtres</span>
                <span className="filters-toggle-meta">{activeCount}</span>
            </button>
            <button
                className="btn-reset filters-mobile-reset"
                onClick={onReset}
                title="Restablir filtres"
                aria-label="Restablir filtres"
                type="button"
            >
                <svg className="filters-reset-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            </button>
        </div>
    );
}

/* ---- EmpresesView ----------------------------------------------- */
function EmpresesView({ empreses, onEmpresaSelect, searchTerm, setSearchTerm, sectorFilter, setSectorFilter, categoriaFilter, setCategoriaFilter, sortBy, setSortBy, currentPage, setCurrentPage }) {
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    const [empresesFiltersOpen, setEmpresesFiltersOpen] = useState(false);
    const itemsPerPage = 24;

    const resetFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setSectorFilter('');
        setCategoriaFilter('');
        setSortBy('amount-desc');
        setCurrentPage(1);
    };

    const categoriesForSector = useMemo(() => {
        if (!sectorFilter) return [];
        const cats = new Set();
        empreses.forEach(e => {
            if (e.sector === sectorFilter && e.categoria) {
                cats.add(e.categoria);
            }
        });
        return Array.from(cats).sort();
    }, [empreses, sectorFilter]);

    const allSectors = useMemo(() => {
        const s = new Set();
        empreses.forEach(e => {
            if (e.sector) s.add(e.sector);
        });
        return Array.from(s).sort();
    }, [empreses]);

    // Removed useEffect that resets categoriaFilter because it runs on mount and any sector change and causes race conditions when rendering.
    // Reset is now handled explicitly in the onClick for the select.

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, sectorFilter, categoriaFilter, sortBy]);

    const empresesFiltrades = useMemo(() => {
        let result = [...empreses];

        if (debouncedSearch) {
            result = result.filter(e => matchesSearchQuery(e.nom, debouncedSearch));
        }

        if (sectorFilter) {
            result = result.filter(e => e.sector === sectorFilter);
        }

        if (categoriaFilter) {
            result = result.filter(e => e.categoria === categoriaFilter);
        }

        switch (sortBy) {
            case 'amount-desc':
                result.sort((a, b) => b.total_importe - a.total_importe);
                break;
            case 'amount-asc':
                result.sort((a, b) => a.total_importe - b.total_importe);
                break;
            case 'contracts-desc':
                result.sort((a, b) => b.num_contratos - a.num_contratos);
                break;
            case 'contracts-asc':
                result.sort((a, b) => a.num_contratos - b.num_contratos);
                break;
            default:
                result.sort((a, b) => b.total_importe - a.total_importe);
        }

        return result;
    }, [empreses, debouncedSearch, sectorFilter, categoriaFilter, sortBy]);

    const totalPages = Math.ceil(empresesFiltrades.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const empresesPaginades = empresesFiltrades.slice(startIndex, endIndex);
    const activeFiltersCount = [
        sectorFilter,
        categoriaFilter,
        sortBy !== 'amount-desc' ? sortBy : ''
    ].filter(Boolean).length;

    const sectorTissue = useMemo(() => {
        const bySector = {};
        for (const e of empreses) {
            const sector = e.sector || 'Altres Serveis i Subministraments';
            if (!bySector[sector]) bySector[sector] = { sector, count: 0 };
            bySector[sector].count += 1;
        }
        const items = Object.values(bySector).sort((a, b) => {
            if (a.sector === 'Altres Serveis i Subministraments') return 1;
            if (b.sector === 'Altres Serveis i Subministraments') return -1;
            return b.count - a.count;
        });
        const maxCount = items.reduce((max, item) => Math.max(max, item.count), 0);
        return { items, maxCount };
    }, [empreses]);

    return (
        <div className="container empreses-page">
            <h1 className="page-title">Cercador d'empreses</h1>
            <div className="search-section">
                <div className="search-input-wrapper">
                    <span className="search-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Cerca per empresa"
                        aria-label="Cerca per empresa"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="search-clear" onClick={() => setSearchTerm('')} type="button" aria-label="Netejar cerca">&times;</button>
                    )}
                </div>

                <FilterActions
                    open={empresesFiltersOpen}
                    onToggle={() => setEmpresesFiltersOpen(prev => !prev)}
                    activeCount={activeFiltersCount}
                    onReset={resetFilters}
                />

                <div className={"filters search-filter-panel" + (!empresesFiltersOpen ? " collapsed" : "")}>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Ordenar per</label>
                        <select className="filter-select" style={{ height: '48px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar empreses per">
                            <option value="amount-desc">Import (descendent)</option>
                            <option value="amount-asc">Import (ascendent)</option>
                            <option value="contracts-desc">Nombre de contractes (descendent)</option>
                            <option value="contracts-asc">Nombre de contractes (ascendent)</option>
                        </select>
                    </div>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Sector</label>
                        <select className="filter-select" style={{ height: '48px' }} value={sectorFilter} onChange={(e) => { setSectorFilter(e.target.value); setCategoriaFilter(''); }} aria-label="Sector">
                            <option value="">Tots els sectors</option>
                            {allSectors
                                .slice()
                                .sort((a, b) => {
                                    if (a === 'Altres Serveis i Subministraments') return 1;
                                    if (b === 'Altres Serveis i Subministraments') return -1;
                                    return a.localeCompare(b, 'ca');
                                })
                                .map(sec => (
                                    <option key={sec} value={sec}>{sec === 'Altres Serveis i Subministraments' ? 'Altres' : sec}</option>
                                ))}
                        </select>
                    </div>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Categoria</label>
                        <select className="filter-select" style={{ height: '48px' }} value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)} disabled={!sectorFilter} aria-label="Categoria">
                            <option value="">{sectorFilter ? 'Totes les categories' : 'Selecciona un sector'}</option>
                            {categoriesForSector
                                .slice()
                                .sort((a, b) => {
                                    if (a === 'Altres serveis comunitaris') return 1;
                                    if (b === 'Altres serveis comunitaris') return -1;
                                    return a.localeCompare(b, 'ca');
                                })
                                .map(cat => (
                                    <option key={cat} value={cat}>{cat === 'Altres serveis comunitaris' ? 'Altres' : cat}</option>
                                ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="results-count">
                <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{empresesFiltrades.length}</strong> empreses</span>
                {empresesFiltrades.length > itemsPerPage && (
                    <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
                )}
            </div>

            <div>
                {empresesPaginades.map(e => (
                    <a
                        key={e.nom}
                        href={buildRouteUrl(e.slug ? `/empreses/${e.slug}` : '/empreses')}
                        className="card-link-wrapper"
                        onClick={(event) => handleInternalLinkClick(event, () => onEmpresaSelect(e.nom))}
                    >
                        <div className="contract-card empresa-list-card">
                            <div className="contract-header">
                                <div className="contract-title">{e.nom}</div>
                                <div className="contract-amount">{formatCurrency(e.total_importe)}</div>
                                <div className="contract-pills empresa-mobile-title-pills">
                                    <span className="contract-pill">{e.num_contratos} contractes</span>
                                </div>
                            </div>
                            <div className="contract-meta">
                                {e.sector && (
                                    <div className="contract-meta-item">
                                        <span className="contract-meta-label">Sector</span>
                                        <span className="contract-meta-value">{e.sector}</span>
                                    </div>
                                )}
                                {e.categoria && (
                                    <div className="contract-meta-item">
                                        <span className="contract-meta-label">Categoria</span>
                                        <span className="contract-meta-value">{e.categoria}</span>
                                    </div>
                                )}
                                <div className="contract-pills empresa-list-title-pills">
                                    <span className="contract-pill">{e.num_contratos} contractes</span>
                                </div>
                            </div>
                        </div>
                    </a>
                ))}
            </div>

            {empresesFiltrades.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <div className="empty-state-title">Sense resultats</div>
                    <div className="empty-state-text">No s'han trobat empreses.</div>
                    <div className="empty-state-action">
                        <button className="empty-state-btn" onClick={resetFilters}>Restablir filtres</button>
                    </div>
                </div>
            )}

            {empresesFiltrades.length > itemsPerPage && (
                <div className="pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={currentPage === 1}
                        title="Primera pàgina"
                    >
                        «
                    </button>
                    <button
                        className="pagination-btn"
                        onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={currentPage === 1}
                        title="Pàgina anterior"
                    >
                        ‹
                    </button>
                    <span className="pagination-info">
                        Pàgina <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                    </span>
                    <button
                        className="pagination-btn"
                        onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={currentPage === totalPages}
                        title="Pàgina següent"
                    >
                        ›
                    </button>
                    <button
                        className="pagination-btn"
                        onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={currentPage === totalPages}
                        title="Última pàgina"
                    >
                        »
                    </button>
                </div>
            )}

            {sectorTissue.items.length > 0 && (
                <div className="sector-tissue-visual" aria-label="Distribució d'empreses adjudicatàries per sector">
                    <div className="sector-tissue-header">
                        <div className="chart-kicker">Visualització</div>
                        <h3>Teixit de contractació</h3>
                    </div>

                    <div className="sector-tissue-bars">
                        {sectorTissue.items.map(item => (
                            <button
                                key={item.sector}
                                type="button"
                                className={"sector-tissue-row" + (sectorFilter === item.sector ? " is-active" : "")}
                                onClick={() => {
                                    setSearchTerm('');
                                    setDebouncedSearch('');
                                    setSectorFilter(item.sector);
                                    setCategoriaFilter('');
                                    setSortBy('amount-desc');
                                    setCurrentPage(1);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                aria-label={`Filtrar empreses del sector ${formatSectorName(item.sector)}`}
                            >
                                <div className="sector-tissue-copy">
                                    <span>{formatSectorName(item.sector)}</span>
                                </div>
                                <div className="sector-tissue-track" aria-hidden="true">
                                    <span style={{ width: `${Math.max(4, Math.round((item.count / sectorTissue.maxCount) * 100))}%` }}></span>
                                </div>
                                <div className="sector-tissue-value">
                                    <span>{item.count}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="metodologia-wrapper">
                <div className="metodologia">
                    <h3 className="metodologia-legal-title">Metodologia</h3>
                    <p className="metodologia-intro">
                        Les empreses que apareixen en aquest cercador han estat adjudicatàries d'un o més contractes per part de l'Ajuntament d'Igualada, segons les dades publicades al Registre Públic de Contractes de la Generalitat de Catalunya.
                    </p>
                    <p className="metodologia-intro">
                        L'import total que figura al costat de cada empresa correspon a la suma dels valors d'adjudicació de tots els contractes que li han estat atorgats. Aparèixer en aquest llistat no implica cap irregularitat, sinó que reflecteix la informació pública disponible sobre la contractació municipal. Les dades poden contenir errors derivats de fonts públiques o processos automatitzats, i qualsevol correcció factual serà revisada.
                    </p>
                    <p className="metodologia-intro">
                        El tractament de les dades es realitza a l'empara de l'article 6.1.e) del Reglament UE 2016/679 (RGPD) d'interès públic i de la Llei 19/2013, de 9 de desembre, de transparència, accés a la informació pública i bon govern, que estableix l'obligació de publicitat activa en matèria de contractació pública. Les dades es limiten a la informació estrictament necessària per al propòsit de transparència i es tracten d'acord amb el principi de minimització de dades (art. 5.1.c RGPD). Tota la informació publicada prové de fonts oficials de caràcter públic i no inclou dades de la vida privada de les persones.
                    </p>
                    <p className="metodologia-intro metodologia-intro-last">
                        Les empreses i persones interessades poden exercir els drets d'accés, rectificació, limitació o oposició al tractament posant-se en contacte a través de la secció <a href="/avis-legal" className="prose-link">Avís legal</a>. El dret de supressió (dret a l'oblit) queda limitat per l'art. 17.3.b) del RGPD quan les dades figuren en registres oficials públics o en documentació administrativa de contractació pública, sense perjudici del dret a sol·licitar la revisió de possibles errors factuals.
                    </p>
                </div>
            </div>
        </div>
    );
}

function EmpresaView({ empresa: empresaNom, contracts, empreses, administradors, onBack, onContractSelect }) {
    const administradorsEmpresa = (administradors && administradors[empresaNom]) || [];
    const empresaData = empreses.find(e => e.nom === empresaNom);
    const allEmpresaContracts = useMemo(() =>
        contracts.filter(c => c.adjudicatario === empresaNom)
        , [contracts, empresaNom]);
    const totalImport = allEmpresaContracts.reduce((sum, c) => sum + c.importe, 0);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [tipusFilter, setTipusFilter] = useState('');
    const [procedureFilter, setProcedureFilter] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [sortBy, setSortBy] = useState('date-desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [showAllAdministradors, setShowAllAdministradors] = useState(false);
    const [empresaFiltersOpen, setEmpresaFiltersOpen] = useState(false);
    const itemsPerPage = 25;
    const maxAdministradorsInitial = isMobile() ? 5 : 10;
    const administradorsVisibles = administradorsEmpresa.slice(0, maxAdministradorsInitial);
    const administradorsExtres = administradorsEmpresa.slice(maxAdministradorsInitial);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, tipusFilter, procedureFilter, dateStart, dateEnd, amountMin, amountMax, sortBy]);
    useEffect(() => { setShowAllAdministradors(false); }, [empresaNom]);

    const empresaContracts = useMemo(() => {
        let result = [...allEmpresaContracts];
        if (debouncedSearch) {
            result = result.filter(c => matchesSearchQuery(
                [c.descripcion, c.adjudicatario, c.codigo],
                debouncedSearch
            ));
        }
        if (tipusFilter) result = result.filter(c => c.tipo === tipusFilter);
        if (procedureFilter) result = result.filter(c => c.procedimiento === procedureFilter);
        if (dateStart) result = result.filter(c => new Date(c.fecha) >= new Date(dateStart));
        if (dateEnd) result = result.filter(c => new Date(c.fecha) <= new Date(dateEnd));
        if (amountMin !== '') result = result.filter(c => Number(c.importe) >= Number(amountMin));
        if (amountMax !== '') result = result.filter(c => Number(c.importe) <= Number(amountMax));
        if (sortBy === 'date-desc') result.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        else if (sortBy === 'date-asc') result.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        else if (sortBy === 'amount-desc') result.sort((a, b) => b.importe - a.importe);
        else if (sortBy === 'amount-asc') result.sort((a, b) => a.importe - b.importe);
        return result;
    }, [allEmpresaContracts, debouncedSearch, tipusFilter, procedureFilter, dateStart, dateEnd, amountMin, amountMax, sortBy]);

    const empresaAnnualActivity = useMemo(() => {
        const byYear = {};
        for (const c of allEmpresaContracts) {
            const year = c.año || (c.fecha ? parseInt(String(c.fecha).slice(0, 4), 10) : null);
            if (!year) continue;
            if (!byYear[year]) byYear[year] = { year, amount: 0, count: 0 };
            byYear[year].amount += Number(c.importe) || 0;
            byYear[year].count += 1;
        }
        const items = Object.values(byYear).sort((a, b) => a.year - b.year);
        const maxAmount = items.reduce((max, item) => Math.max(max, item.amount), 0);
        return { items, maxAmount };
    }, [allEmpresaContracts]);

    const totalPages = Math.ceil(empresaContracts.length / itemsPerPage);
    const contractesPaginats = empresaContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const resetFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setTipusFilter('');
        setProcedureFilter('');
        setDateStart('');
        setDateEnd('');
        setAmountMin('');
        setAmountMax('');
        setSortBy('date-desc');
        setCurrentPage(1);
    };
    const activeFiltersCount = [
        tipusFilter,
        procedureFilter,
        dateStart,
        dateEnd,
        amountMin,
        amountMax,
        sortBy !== 'date-desc' ? sortBy : ''
    ].filter(Boolean).length;

    return (
        <div className="container empresa-detail-page">
            <button
                onClick={onBack}
                className="btn-reset contracte-detail-back"
                style={{ marginBottom: '1.25rem' }}
                title="Tornar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>
            <div className="empresa-detail-hero">
                <div className="contract-header empresa-detail-title-row">
                    <h1 className="empresa-detail-title">{empresaNom}</h1>
                    <div className="empresa-detail-amount">{formatCurrency(totalImport)}</div>
                    <div className="contract-pills empresa-mobile-title-pills">
                        <span className="contract-pill pill-on-dark">{allEmpresaContracts.length} contractes</span>
                    </div>
                </div>
                <div className="contract-meta empresa-detail-meta">
                    {empresaData?.sector && (
                        <div className="contract-meta-item">
                            <span className="contract-meta-label">Sector</span>
                            <span className="contract-meta-value">{empresaData.sector}</span>
                        </div>
                    )}
                    {empresaData?.categoria && (
                        <div className="contract-meta-item">
                            <span className="contract-meta-label">Categoria</span>
                            <span className="contract-meta-value">{empresaData.categoria}</span>
                        </div>
                    )}
                    <div className="contract-pills empresa-detail-title-pills">
                        <span className="contract-pill pill-on-dark">{allEmpresaContracts.length} contractes</span>
                    </div>
                </div>
                <div className="empresa-detail-cargos">
                    <div className="contract-meta-label empresa-detail-cargos-label">
                        Càrrecs actius
                    </div>
                    {administradorsEmpresa.length > 0 ? (
                        <ul className="empresa-detail-cargos-list">
                            {administradorsVisibles.map((a, i) => (
                                <li key={i} className="empresa-detail-cargo-item">
                                    <span className="empresa-detail-cargo-name">{a.nombre}</span>
                                    <span className="empresa-detail-cargo-meta">{a.cargo}<span>{a.fecha_nombramiento}</span></span>
                                </li>
                            ))}
                            {administradorsEmpresa.length > maxAdministradorsInitial && (
                                <li className="empresa-detail-cargos-more">
                                    <div className={"empresa-detail-cargos-more-panel" + (showAllAdministradors ? " is-open" : "")}>
                                        <div>
                                            <ul className="empresa-detail-cargos-list">
                                                {administradorsExtres.map((a, i) => (
                                                    <li key={i} className="empresa-detail-cargo-item">
                                                        <span className="empresa-detail-cargo-name">{a.nombre}</span>
                                                        <span className="empresa-detail-cargo-meta">{a.cargo}<span>{a.fecha_nombramiento}</span></span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowAllAdministradors(v => !v)}
                                        className={"empresa-detail-cargos-toggle" + (showAllAdministradors ? " is-open" : "")}
                                    >
                                        {showAllAdministradors ? 'Veure menys' : 'Veure tots'}
                                    </button>
                                </li>
                            )}
                        </ul>
                    ) : (
                        <div className="empresa-detail-cargos-empty">
                            No s'han trobat càrrecs actius
                        </div>
                    )}
                </div>
            </div>
            {empresaAnnualActivity.items.length > 1 && (
                <div className="empresa-activity-visual" aria-label="Evolució anual de l'import adjudicat a aquesta empresa">
                    <div className="empresa-activity-header">
                        <div className="chart-kicker">Visualització</div>
                        <h3>Activitat de contractació</h3>
                    </div>

                    <div className="empresa-activity-bars">
                        {empresaAnnualActivity.items.map(item => (
                            <button
                                key={item.year}
                                type="button"
                                className={"empresa-activity-column" + (dateStart === `${item.year}-01-01` && dateEnd === `${item.year}-12-31` ? " is-active" : "")}
                                onClick={() => {
                                    setSearchTerm('');
                                    setDebouncedSearch('');
                                    setTipusFilter('');
                                    setProcedureFilter('');
                                    setAmountMin('');
                                    setAmountMax('');
                                    setSortBy('date-desc');
                                    setDateStart(`${item.year}-01-01`);
                                    setDateEnd(`${item.year}-12-31`);
                                    setCurrentPage(1);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                aria-label={`Filtrar contractes de ${empresaNom} de l'any ${item.year}`}
                            >
                                <div className="empresa-activity-bar-wrap" aria-hidden="true">
                                    <span style={{ height: `${Math.max(4, Math.round((item.amount / empresaAnnualActivity.maxAmount) * 100))}%`, '--bar-width': `${Math.max(4, Math.round((item.amount / empresaAnnualActivity.maxAmount) * 100))}%` }}></span>
                                </div>
                                <div className="empresa-activity-meta">
                                    <span>{item.year}</span>
                                    <small>{formatCurrency(item.amount)}</small>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="search-section" style={{ marginBottom: '2rem' }}>
                <div className="search-input-wrapper">
                    <span className="search-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Cerca per descripció, empresa o codi d'expedient"
                        aria-label="Cerca per descripció, empresa o codi d'expedient"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="search-clear" onClick={() => setSearchTerm('')} type="button" aria-label="Netejar cerca">&times;</button>
                    )}
                </div>
                <FilterActions
                    open={empresaFiltersOpen}
                    onToggle={() => setEmpresaFiltersOpen(prev => !prev)}
                    activeCount={activeFiltersCount}
                    onReset={resetFilters}
                />

                <div className={"filters search-filter-panel" + (!empresaFiltersOpen ? " collapsed" : "")}>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Ordenar per</label>
                        <select className="filter-select" style={{ height: '48px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar contractes de l'empresa per">
                            <option value="date-desc">Data (més recents)</option>
                            <option value="date-asc">Data (més antics)</option>
                            <option value="amount-desc">Import (descendent)</option>
                            <option value="amount-asc">Import (ascendent)</option>
                        </select>
                    </div>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Procediment</label>
                        <select className="filter-select" style={{ height: '48px' }} value={procedureFilter} onChange={(e) => setProcedureFilter(e.target.value)} aria-label="Procediment">
                            <option value="">Tots els procediments</option>
                            <option value="Menor">Menor</option>
                            <option value="Obert">Obert</option>
                            <option value="Negociat sense publicitat">Negociat sense publicitat</option>
                            <option value="Licitació amb negociació">Licitació amb negociació</option>
                            <option value="Adjudicacions directes no menors">Adjudicació directa</option>
                            <option value="Específic de sistema dinàmic de contractació">Sistema dinàmic</option>
                        </select>
                    </div>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Tipus</label>
                        <select className="filter-select" style={{ height: '48px' }} value={tipusFilter} onChange={(e) => setTipusFilter(e.target.value)} aria-label="Tipus de contracte">
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
                <div className={"filters-row search-filter-panel search-filter-panel-secondary" + (!empresaFiltersOpen ? " collapsed" : "")}>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Data inici</label>
                        <input type="date" className="filter-input" aria-label="Data inici" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                    </div>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Data final</label>
                        <input type="date" className="filter-input" aria-label="Data final" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                    </div>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Des de</label>
                        <input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import mínim" aria-label="Import mínim" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
                    </div>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Fins a</label>
                        <input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import màxim" aria-label="Import màxim" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="results-count">
                <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{empresaContracts.length}</strong> contractes</span>
                {empresaContracts.length > itemsPerPage && (
                    <span className="results-count-page">
                        <span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span>{' '}
                        <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                    </span>
                )}
            </div>
            {contractesPaginats.map(c => (
                <a
                    key={c.id}
                    href={buildRouteUrl(`/contractes/${c.slug}`)}
                    className="card-link-wrapper"
                    onClick={(event) => handleInternalLinkClick(event, () => onContractSelect(c))}
                >
                    <div className="contract-card">
                        <div className="contract-header">
                            <div className="contract-title">{c.descripcion}</div>
                            <div className="contract-amount">{formatCurrency(c.importe)}</div>
                        </div>
                        <div className="contract-meta">
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
            {empresaContracts.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <div className="empty-state-title">Sense resultats</div>
                    <div className="empty-state-text">No s'han trobat contractes.</div>
                    <div className="empty-state-action">
                        <button className="empty-state-btn" onClick={resetFilters}>Restablir filtres</button>
                    </div>
                </div>
            )}
            {empresaContracts.length > itemsPerPage && (
                <div className="pagination">
                    <button className="pagination-btn" onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1} title="Primera pàgina">«</button>
                    <button className="pagination-btn" onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1} title="Pàgina anterior">‹</button>
                    <span className="pagination-info">Pàgina <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
                    <button className="pagination-btn" onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages} title="Pàgina següent">›</button>
                    <button className="pagination-btn" onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages} title="Última pàgina">»</button>
                </div>
            )}
        </div>
    );
}

/* ---- PersonesView (beginning — merges with existing file end) ---- */
function PersonesView({ persones, onEmpresaSelect, onNavigateLegal, searchTerm, setSearchTerm, sortBy, setSortBy, currentPage, setCurrentPage, expandedIdx, setExpandedIdx }) {
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    const [personesFiltersOpen, setPersonesFiltersOpen] = useState(false);
    const itemsPerPage = 25;

    const togglePersona = (idx) => {
        setExpandedIdx(prev => prev === idx ? null : idx);
    };

    const resetFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setSortBy('companies-desc');
        setCurrentPage(1);
        setExpandedIdx(null);
    };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
        setExpandedIdx(null);
    }, [debouncedSearch, sortBy]);

    const personesFiltrades = useMemo(() => {
        let result = [...persones];

        if (debouncedSearch) {
            result = result.filter(p => matchesSearchQuery(
                [p.nom, ...(p.relacions || []).map(e => e.empresa)],
                debouncedSearch
            ));
        }

        switch (sortBy) {
            case 'amount-desc':
                result.sort((a, b) => b.total_adjudicat - a.total_adjudicat);
                break;
            case 'amount-asc':
                result.sort((a, b) => a.total_adjudicat - b.total_adjudicat);
                break;
            case 'companies-desc':
                result.sort((a, b) => b.relacions.length - a.relacions.length);
                break;
            case 'companies-asc':
                result.sort((a, b) => a.relacions.length - b.relacions.length);
                break;
            case 'name-asc':
                result.sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
                break;
            default:
                result.sort((a, b) => b.total_adjudicat - a.total_adjudicat);
        }

        return result;
    }, [persones, debouncedSearch, sortBy]);

    const totalPages = Math.ceil(personesFiltrades.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const personesPaginades = personesFiltrades.slice(startIndex, endIndex);
    const activeFiltersCount = sortBy !== 'companies-desc' ? 1 : 0;

    return (
        <div className="container persones-page">
            <h1 className="page-title">Cercador de persones</h1>
            <div className="search-section">
                <div className="search-input-wrapper">
                    <span className="search-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Cerca per persona o empresa vinculada"
                        aria-label="Cerca per persona o empresa vinculada"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="search-clear" onClick={() => setSearchTerm('')} type="button" aria-label="Netejar cerca">&times;</button>
                    )}
                </div>

                <FilterActions
                    open={personesFiltersOpen}
                    onToggle={() => setPersonesFiltersOpen(prev => !prev)}
                    activeCount={activeFiltersCount}
                    onReset={resetFilters}
                />

                <div className={"filters search-filter-panel search-filter-panel-single" + (!personesFiltersOpen ? " collapsed" : "")}>
                    <div className="filter-group" style={{ flex: '1 1 200px' }}>
                        <label className="filter-label">Ordenar per</label>
                        <select className="filter-select" style={{ height: '48px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar persones per">
                            <option value="companies-desc">Nombre d'empreses (descendent)</option>
                            <option value="companies-asc">Nombre d'empreses (ascendent)</option>
                            <option value="amount-desc">Import (descendent)</option>
                            <option value="amount-asc">Import (ascendent)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="results-count">
                <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{personesFiltrades.length}</strong> persones</span>
                {personesFiltrades.length > itemsPerPage && (
                    <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
                )}
            </div>

            <div className="persones-compact-list">
                {personesPaginades.map((p, idx) => {
                    const isExpanded = expandedIdx === idx;
                    return (
                        <div key={idx} className="contract-card persona-card">
                            <button
                                type="button"
                                className={`persona-row-header${isExpanded ? ' is-expanded' : ''}`}
                                onClick={() => togglePersona(idx)}
                                aria-expanded={isExpanded}
                            >
                                <div className="persona-row-header-left">
                                    <div>
                                        <div className="contract-title persona-title">{p.nom}</div>
                                    </div>
                                </div>
                                <div className="persona-row-header-right">
                                    <div className="persona-row-amount">
                                        <div className="contract-amount persona-amount">
                                            {formatCurrency(p.total_adjudicat)}
                                        </div>
                                        <div className="contract-meta-value persona-amount-caption">
                                            De {p.relacions.length} {p.relacions.length === 1 ? 'empresa' : 'empreses'}
                                        </div>
                                    </div>
                                    <div className={`persona-row-chevron${isExpanded ? ' is-expanded' : ''}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                    </div>
                                </div>
                            </button>

                            <div className={`persona-row-body-wrapper${isExpanded ? ' is-expanded' : ''}`}>
                                <div>
                                    <div className="persona-row-body">
                                        <div className="persona-relacions-list">
                                            {p.relacions.map((emp, i) => (
                                                <a
                                                    key={i}
                                                    href={buildRouteUrl(`/empreses/${buildEmpresaSlug(emp.empresa)}`)}
                                                    className="persona-relacio-item"
                                                    onClick={(event) => handleInternalLinkClick(event, () => onEmpresaSelect(emp.empresa))}
                                                >
                                                    <div className="persona-relacio-empresa">{emp.empresa}</div>
                                                    <div className="contract-amount persona-relacio-amount">
                                                        {formatCurrency(emp.import_empresa)}
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {personesFiltrades.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                    <div className="empty-state-title">Sense resultats</div>
                    <div className="empty-state-text">No s'han trobat persones.</div>
                    <div className="empty-state-action">
                        <button className="empty-state-btn" onClick={resetFilters}>Restablir filtres</button>
                    </div>
                </div>
            )}

            {personesFiltrades.length > itemsPerPage && (
                <div className="pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={currentPage === 1}
                        title="Primera pàgina"
                    >
                        «
                    </button>
                    <button
                        className="pagination-btn"
                        onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={currentPage === 1}
                        title="Pàgina anterior"
                    >
                        ‹
                    </button>
                    <span className="pagination-info">
                        Pàgina <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                    </span>
                    <button
                        className="pagination-btn"
                        onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={currentPage === totalPages}
                        title="Pàgina següent"
                    >
                        ›
                    </button>
                    <button
                        className="pagination-btn"
                        onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={currentPage === totalPages}
                        title="Última pàgina"
                    >
                        »
                    </button>
                </div>
            )}

            <div className="metodologia-wrapper">
                <div className="metodologia">
                    <h3 className="metodologia-legal-title">Metodologia</h3>
                    <p className="metodologia-intro">
                        Les persones que apareixen en aquest cercador es mostren en la seva condició de representants mercantils d'empreses adjudicatàries de l'Ajuntament d'Igualada, segons les dades del Butlletí Oficial del Registre Mercantil (BORME) i la plataforma de contractació municipal, registres oficials de caràcter públic i universal.
                    </p>
                    <p className="metodologia-intro">
                        L'import que figura al costat de cada persona correspon al volum total adjudicat a les empreses on exerceix o ha exercit un càrrec mercantil. Aparèixer en aquest llistat no implica cap irregularitat, sinó que reflecteix únicament la vinculació professional pública entre la persona i les empreses que han contractat amb l'Ajuntament. Les dades poden contenir errors derivats de fonts públiques o processos automatitzats, i qualsevol correcció factual serà revisada.
                    </p>
                    <p className="metodologia-intro">
                        El tractament de les dades es realitza a l'empara de l'article 6.1.e) del Reglament UE 2016/679 (RGPD) d'interès públic i de la Llei 19/2013, de 9 de desembre, de transparència, accés a la informació pública i bon govern, que estableix l'obligació de publicitat activa en matèria de contractació pública. Les dades es limiten a la informació estrictament necessària per al propòsit de transparència i es tracten d'acord amb el principi de minimització de dades (art. 5.1.c RGPD). Tota la informació publicada prové de fonts oficials de caràcter públic i no inclou dades de la vida privada de les persones.
                    </p>
                    <p className="metodologia-intro metodologia-intro-last">
                        Les persones interessades poden exercir els drets d'accés, rectificació, limitació o oposició al tractament posant-se en contacte a través de la secció <a href="/avis-legal" onClick={(e) => { e.preventDefault(); onNavigateLegal(); }} className="prose-link">Avís legal</a>. El dret de supressió (dret a l'oblit) queda limitat per l'art. 17.3.b) del RGPD quan les dades figuren en registres oficials públics o en documentació administrativa de contractació pública, sense perjudici del dret a sol·licitar la revisió de possibles errors factuals.
                    </p>
                </div>
            </div>
        </div>
    );
}

function App() {
    // Treu el prefix BASE i normalitza la URL actual
    const getRoute = () => {
        let p = window.location.pathname;
        if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
        if (!p.startsWith('/')) p = '/' + p;
        // Suporta /contractes/ amb barra final
        if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
        return p;
    };
    const tabFromPath = (p) => resolveRoute(p).tab;
    const [activeTab, setActiveTab] = useState(() => tabFromPath(getRoute()));
    const [pendingEmpresaSlug, setPendingEmpresaSlug] = useState(() => {
        const p = getRoute();
        return p.startsWith('/empreses/') ? p.slice('/empreses/'.length) : null;
    });
    const [pendingContractSlug, setPendingContractSlug] = useState(() => {
        const p = getRoute();
        return p.startsWith('/contractes/') ? p.slice('/contractes/'.length) : null;
    });
    const [selectedContractForDetail, setSelectedContractForDetail] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [empreses, setEmpreses] = useState([]);
    const [persones, setPersones] = useState([]);
    const [administradors, setAdministradors] = useState({});
    const [fraudes, setFraudes] = useState([]);
    const [concentracio, setConcentracio] = useState([]);
    const [electoral, setElectoral] = useState([]);
    const [monopolio, setMonopolio] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [personesLoaded, setPersonesLoaded] = useState(false);
    const [administradorsLoaded, setAdministradorsLoaded] = useState(false);
    const [analisiLoaded, setAnalisiLoaded] = useState(false);
    const [coreDataError, setCoreDataError] = useState(false);
    const [personesError, setPersonesError] = useState(false);
    const [administradorsError, setAdministradorsError] = useState(false);
    const [analisiError, setAnalisiError] = useState(false);
    const [coreRetry, setCoreRetry] = useState(0);
    const [personesRetry, setPersonesRetry] = useState(0);
    const [administradorsRetry, setAdministradorsRetry] = useState(0);
    const [analisiRetry, setAnalisiRetry] = useState(0);
    const [summary, setSummary] = useState(null);
    const [summaryResolved, setSummaryResolved] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [homeIntroFading, setHomeIntroFading] = useState(false);
    const [threeReadyTick, setThreeReadyTick] = useState(0);
    const [showMobileScrollTop, setShowMobileScrollTop] = useState(false);
    const [isPageTop, setIsPageTop] = useState(() => window.scrollY < 24);
    const [homeRouteTransition, setHomeRouteTransition] = useState('');
    const [homeMetricTransition, setHomeMetricTransition] = useState(null);
    const homeIntroPlayedRef = useRef(false);

    useEffect(() => {
        if (!loading) return;
        const startTime = Date.now();
        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const p = 95 * (1 - Math.exp(-elapsed / 800));
            setLoadingProgress(Math.floor(p));
        }, 50);
        return () => clearInterval(timer);
    }, [loading]);

    useEffect(() => {
        let cancelled = false;
        fetch(assetUrl('/json/resum.json'), { cache: 'no-cache' })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (cancelled) return;
                if (data) {
                    setDataVersion(data.version);
                    setSummary(data);
                    if (data.stats) {
                        setStats({
                            total_contratos: data.stats.total_contratos || 0,
                            importe_total: data.stats.importe_total || 0,
                            num_empresas: data.stats.num_empresas || 0,
                        });
                    }
                }
            })
            .catch(err => {
                console.warn('No s\'ha pogut carregar el resum inicial:', err);
            })
            .finally(() => {
                if (cancelled) return;
                setSummaryResolved(true);
                setLoadingProgress(100);
                setTimeout(() => {
                    if (!cancelled) setLoading(false);
                }, 180);
            });
        return () => { cancelled = true; };
    }, []);

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
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [procedureFilter, setProcedureFilter] = useState('');
    const [riskFilter, setRiskFilter] = useState('TOTS');
    const [analisiSearch, setAnalisiSearch] = useState('');
    const [analisiSort, setAnalisiSort] = useState('risk-desc');
    const [concentracioMode, setConcentracioMode] = useState('historic');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [analisiFiltersOpen, setAnalisiFiltersOpen] = useState(false);
    const [analisiPageFrac, setAnalisiPageFrac] = useState(1);
    const [analisiPageElect, setAnalisiPageElect] = useState(1);
    const [analisiPageMonop, setAnalisiPageMonop] = useState(1);
    const analisiItemsPerPage = 25;
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [sortBy, setSortBy] = useState('date-desc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;
    const [analisiTab, setAnalisiTab] = useState('fraccionament');
    const [selectedCasoDetail, setSelectedCasoDetail] = useState(null);
    const [selectedConcentracioDetail, setSelectedConcentracioDetail] = useState(null);
    const [selectedElectoralismeDetail, setSelectedElectoralismeDetail] = useState(null);
    const [pendingCasId, setPendingCasId] = useState(() => {
        const p = getRoute();
        return p.startsWith('/analisi/fraccionament/') ? p.slice('/analisi/fraccionament/'.length) : null;
    });
    const [pendingConcentracioId, setPendingConcentracioId] = useState(() => {
        const p = getRoute();
        return p.startsWith('/analisi/concentracio/') ? p.slice('/analisi/concentracio/'.length) : null;
    });
    const [pendingElectoralismeId, setPendingElectoralismeId] = useState(() => {
        const p = getRoute();
        return p.startsWith('/analisi/electoralisme/') ? p.slice('/analisi/electoralisme/'.length) : null;
    });
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
            'analisi': '/analisi',
            'cas-fraccionament': '/analisi/fraccionament',
            'cas-concentracio': '/analisi/concentracio',
            'sobre': '/sobre',
            'legal': '/avis-legal'
        };
        const route = customPath !== null ? customPath : (pathMap[tab] || '/');
        const normalizedRoute = (route.length > 1 && route.endsWith('/')) ? route.slice(0, -1) : route;
        const fullPath = (BASE + normalizedRoute).replace(/\/+$/, '') || '/';
        if (getRoute() !== normalizedRoute) {
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
            const p = getRoute();
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
            else {
                const tab = resolved.tab;
                if (tab === 'empreses') setSelectedEmpresa(null);
                if (tab === 'buscador') setSelectedContractForDetail(null);
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
        const y = restoreScrollRef.current;
        restoreScrollRef.current = null;
        requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'auto' }));
    }, [activeTab, selectedContractForDetail, selectedEmpresa, selectedCasoDetail, selectedConcentracioDetail, selectedElectoralismeDetail]);

    useEffect(() => {
        if (!pendingScrollTopRef.current || restoreScrollRef.current !== null) return;
        if (activeTab === 'contracte' && !selectedContractForDetail) return;
        if (activeTab === 'empresa' && !selectedEmpresa) return;
        if (activeTab === 'cas-fraccionament' && !selectedCasoDetail) return;
        if (activeTab === 'cas-concentracio' && !selectedConcentracioDetail) return;
        if (activeTab === 'cas-electoralisme' && !selectedElectoralismeDetail) return;
        pendingScrollTopRef.current = false;

        const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        scrollTop();
        requestAnimationFrame(() => {
            scrollTop();
            requestAnimationFrame(scrollTop);
        });
        window.setTimeout(scrollTop, 80);
    }, [activeTab, selectedContractForDetail, selectedEmpresa, selectedCasoDetail, selectedConcentracioDetail, selectedElectoralismeDetail]);
    // ---------------------------------------------

    // Debounce de la cerca
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const contractCount = useCountUp(stats?.total_contratos || 0, 2000, !loading && stats);
    const importTotal = useCountUp(stats ? Math.floor(stats.importe_total / 1000000) : 0, 2000, !loading && stats);
    const importTotalTenths = useCountUp(stats ? Math.round(stats.importe_total / 100000) : 0, 2000, !loading && stats);
    const empresasCount = useCountUp(stats?.num_empresas || 0, 2000, !loading && stats);
    const personesMetricTotal = persones.length || summary?.stats?.num_persones || 0;
    const personesCount = useCountUp(personesMetricTotal, 2000, !loading && stats);
    const alertesVisibleTotal = useMemo(() =>
        fraudes.filter(f => f.nivell !== 'BAIX').length +
        concentracio.length +
        electoral.filter(f => f.nivell !== 'BAIX').length
        , [fraudes, concentracio, electoral]);
    const alertesMetricTotal = alertesVisibleTotal || summary?.stats?.num_alertes || 0;
    const alertesCount = useCountUp(alertesMetricTotal, 2000, !loading && stats);
    const homeRiskCounts = useMemo(() => {
        if (!fraudes.length && !concentracio.length && !electoral.length && summary?.home?.risk_counts) {
            return summary.home.risk_counts;
        }
        const levels = [...fraudes, ...concentracio, ...electoral]
            .map(item => String(item.nivell || '').toUpperCase());

        return {
            alt: levels.filter(level => level === 'CRITIC').length,
            mitja: levels.filter(level => level === 'ALT').length,
            baix: levels.filter(level => level === 'OBSERVACIO' || level === 'BAIX').length,
        };
    }, [fraudes, concentracio, electoral, summary]);

    useEffect(() => {
        if (!summaryResolved) return;
        let cancelled = false;
        setCoreDataError(false);
        setDataLoading(true);
        Promise.all([
            fetchAllContractsCached(),
            fetch(jsonAssetUrl('/json/empreses.json')).then(res => {
                if (!res.ok) throw new Error(`Empreses HTTP ${res.status}`);
                return res.json();
            }),
            fetchArchivedContracts(),
            fetchEmpresaAliases()
        ])
            .then(async ([socrataRows, existingEmpreses, archiveRows, empresaAliases]) => {
                if (cancelled) return;
                // Map Socrata rows to internal contract format
                let contractsData = socrataRows.map((row, i) =>
                    row && row.__iguadataInternalContract
                        ? Object.fromEntries(Object.entries(row).filter(([key]) => key !== '__iguadataInternalContract'))
                        : mapSocrataContract(row, i + 1)
                );
                contractsData = mergeArchivedContracts(contractsData, archiveRows);
                const expectedContracts = summary?.stats?.total_contratos || 0;
                if (expectedContracts && contractsData.length < expectedContracts) {
                    const snapshotRows = await fetchStaticContractsSnapshot();
                    if (cancelled) return;
                    contractsData = mergeMissingSnapshotContracts(contractsData, snapshotRows);
                }
                // Desambigua col·lisions de slug (extremadament rar): afegeix sufix -2, -3...
                {
                    const slugCounts = new Map();
                    const legacySeen = new Map();
                    for (const c of contractsData) {
                        const baseSlug = buildContractSlug(c);
                        slugCounts.set(baseSlug, (slugCounts.get(baseSlug) || 0) + 1);
                    }
                    for (const c of contractsData) {
                        const baseSlug = buildContractSlug(c);
                        const legacyBaseSlug = buildLegacyContractSlug(c);
                        c.slug = slugCounts.get(baseSlug) > 1
                            ? `${baseSlug}-${stableHash([c.fecha, c.importe, c.adjudicatario])}`
                            : baseSlug;

                        const legacyN = (legacySeen.get(legacyBaseSlug) || 0) + 1;
                        legacySeen.set(legacyBaseSlug, legacyN);
                        const legacySlug = legacyN > 1 ? `${legacyBaseSlug}-${legacyN}` : legacyBaseSlug;
                        c.slug_aliases = Array.from(new Set([legacyBaseSlug, legacySlug].filter(s => s && s !== c.slug)));
                    }
                }
                setContracts(contractsData);

                // Compute stats on the fly
                const uniqueEmps = new Set(contractsData.map(c => c.adjudicatario).filter(Boolean));
                setStats({
                    total_contratos: contractsData.length,
                    importe_total: contractsData.reduce((s, c) => s + c.importe, 0),
                    num_empresas: uniqueEmps.size,
                });

                // Build empreses: existing AI classifications + CPV for new ones
                const empresesData = buildEmpreses(contractsData, existingEmpreses);

                // Asignar IDs cronológicos a las empresas
                empresesData.forEach(e => {
                    e.firstContractId = Math.min(...e.contratos);
                });
                const sortedChronological = [...empresesData].sort((a, b) => a.firstContractId - b.firstContractId);
                sortedChronological.forEach((e, index) => {
                    e.id = index + 1; // 1-indexed (intern, ja no s'usa a la URL)
                });
                // Slugs estables a partir del nom; desambigua col·lisions amb sufix numèric
                {
                    const seen = new Map();
                    for (const e of empresesData) {
                        let s = buildEmpresaSlug(e.nom);
                        const n = (seen.get(s) || 0) + 1;
                        seen.set(s, n);
                        if (n > 1) s = `${s}-${n}`;
                        e.slug = s;
                    }
                    const aliasSlugMap = buildEmpresaAliasSlugMap(empresesData, empresaAliases);
                    for (const e of empresesData) {
                        e.slug_aliases = Array.from(aliasSlugMap.entries())
                            .filter(([, targetSlug]) => targetSlug === e.slug)
                            .map(([aliasSlug]) => aliasSlug);
                    }
                }
                setEmpreses(empresesData);
                setDataLoading(false);
            })
            .catch(err => {
                if (cancelled) return;
                console.error('Error loading data:', err);
                setCoreDataError(true);
                setDataLoading(false);
            });
        return () => { cancelled = true; };
    }, [summaryResolved, coreRetry]);

    useEffect(() => {
        if (!summaryResolved || activeTab !== 'persones' || personesLoaded) return;
        let cancelled = false;
        setPersonesError(false);
        fetch(jsonAssetUrl('/json/persones.json'))
            .then(res => {
                if (!res.ok) throw new Error(`Persones HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (!cancelled) setPersones(data || []);
            })
            .catch(err => {
                console.error('Error loading persones:', err);
                if (!cancelled) setPersonesError(true);
            })
            .finally(() => {
                if (!cancelled) setPersonesLoaded(true);
            });
        return () => { cancelled = true; };
    }, [activeTab, summaryResolved, personesLoaded, personesRetry]);

    useEffect(() => {
        if (!summaryResolved || activeTab !== 'empresa' || administradorsLoaded) return;
        let cancelled = false;
        setAdministradorsError(false);
        fetch(jsonAssetUrl('/json/carrecs.json'))
            .then(res => {
                if (!res.ok) throw new Error(`Carrecs HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (!cancelled) setAdministradors(data || {});
            })
            .catch(err => {
                console.error('Error loading carrecs:', err);
                if (!cancelled) setAdministradorsError(true);
            })
            .finally(() => {
                if (!cancelled) setAdministradorsLoaded(true);
            });
        return () => { cancelled = true; };
    }, [activeTab, summaryResolved, administradorsLoaded, administradorsRetry]);

    useEffect(() => {
        const analisiTabs = ['analisi', 'cas-fraccionament', 'cas-concentracio', 'cas-electoralisme'];
        const shouldLoadImmediately = analisiTabs.includes(activeTab);
        const shouldLoadWhenIdle = activeTab === 'home' && !dataLoading;
        if (!summaryResolved || analisiLoaded || (!shouldLoadImmediately && !shouldLoadWhenIdle)) return;

        let cancelled = false;
        let idleId = null;
        let timeoutId = null;
        const loadAnalisi = () => {
            setAnalisiError(false);
            Promise.all([
                fetch(jsonAssetUrl('/json/fraccionament.json')).then(res => {
                    if (!res.ok) throw new Error(`Fraccionament HTTP ${res.status}`);
                    return res.json();
                }),
                fetch(jsonAssetUrl('/json/concentracio.json')).then(res => {
                    if (!res.ok) throw new Error(`Concentracio HTTP ${res.status}`);
                    return res.json();
                }),
                fetch(jsonAssetUrl('/json/electoralisme.json')).then(res => {
                    if (!res.ok) throw new Error(`Electoralisme HTTP ${res.status}`);
                    return res.json();
                })
            ])
                .then(([fraccionamentData, concentracioData, electoralismeData]) => {
                    if (cancelled) return;
                    setFraudes((fraccionamentData && fraccionamentData.alertes) || []);
                    setConcentracio((concentracioData && concentracioData.alertes) || []);
                    setElectoral((electoralismeData && electoralismeData.alertes) || []);
                })
                .catch(err => {
                    console.error('Error loading analysis data:', err);
                    if (!cancelled) setAnalisiError(true);
                })
                .finally(() => {
                    if (!cancelled) setAnalisiLoaded(true);
                });
        };

        if (shouldLoadImmediately) {
            loadAnalisi();
        } else if ('requestIdleCallback' in window) {
            idleId = window.requestIdleCallback(loadAnalisi, { timeout: 2500 });
        } else {
            timeoutId = window.setTimeout(loadAnalisi, 800);
        }

        return () => {
            cancelled = true;
            if (idleId !== null) window.cancelIdleCallback(idleId);
            if (timeoutId !== null) window.clearTimeout(timeoutId);
        };
    }, [activeTab, summaryResolved, dataLoading, analisiLoaded, analisiRetry]);

    useEffect(() => {
        const route = getRoute();
        const resolved = resolveRoute(route);
        if (resolved.canonicalPath !== route) {
            handleNavigation(resolved.tab, resolved.canonicalPath, { replace: true });
        }
    }, []);

    // Handle deep linking to a contract once the data loads
    useEffect(() => {
        if (contracts.length > 0 && pendingContractSlug) {
            const c = contracts.find(c => contractMatchesSlug(c, pendingContractSlug));
            if (c) {
                setSelectedContractForDetail(c);
                if (c.slug !== pendingContractSlug) {
                    handleNavigation('contracte', `/contractes/${c.slug}`, { replace: true });
                }
            } else {
                handleNavigation('buscador', null, { replace: true });
            }
            setPendingContractSlug(null);
        }
    }, [contracts, pendingContractSlug]);

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
            } else {
                handleNavigation('analisi', '/analisi', { replace: true });
            }
            setPendingElectoralismeId(null);
        }
    }, [electoral, pendingElectoralismeId]);

    useEffect(() => {
        if (activeTab === 'contracte' && selectedContractForDetail) {
            document.title = formatPageTitle(selectedContractForDetail.descripcion);
            return;
        }
        if (activeTab === 'empresa' && selectedEmpresa) {
            document.title = formatPageTitle(selectedEmpresa);
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
        const titles = {
            'home': "Iguadata | El projecte de transparència d'Igualada",
            'loading': 'Iguadata',
            buscador: 'Contractes | Iguadata',
            empreses: 'Empreses | Iguadata',
            persones: 'Persones | Iguadata',
            analisi: 'Anàlisi | Iguadata',
            sobre: 'Sobre | Iguadata',
            legal: 'Iguadata'
        };
        document.title = titles[activeTab] || 'Iguadata';
    }, [activeTab, selectedContractForDetail, selectedEmpresa, selectedCasoDetail, selectedConcentracioDetail, selectedElectoralismeDetail]);

    const contractesFiltrats = useMemo(() => {
        let result = [...contracts];

        if (debouncedSearch) {
            result = result.filter(c => matchesSearchQuery(
                [c.descripcion, c.adjudicatario, c.codigo],
                debouncedSearch
            ));
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

    const contractesAnnualEvolution = useMemo(() => {
        const byYear = {};
        for (const c of contracts) {
            const year = c.año || (c.fecha ? parseInt(String(c.fecha).slice(0, 4), 10) : null);
            if (!year) continue;
            if (!byYear[year]) byYear[year] = { year, amount: 0, count: 0 };
            byYear[year].amount += Number(c.importe) || 0;
            byYear[year].count += 1;
        }
        const items = Object.values(byYear).sort((a, b) => a.year - b.year);
        const maxAmount = items.reduce((max, item) => Math.max(max, item.amount), 0);
        const topYear = items.reduce((top, item) => item.amount > (top?.amount || 0) ? item : top, null);
        return { items, maxAmount, topYear };
    }, [contracts]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, typeFilter, procedureFilter, dateStart, dateEnd, amountMin, amountMax, sortBy]);

    const fraudesFiltrats = useMemo(() => {
        let result = fraudes.filter(f => f.nivell !== 'BAIX');
        if (riskFilter !== 'TOTS') {
            result = result.filter(f => f.nivell === riskFilter || f.nivel_riesgo === riskFilter);
        }
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
    }, [fraudes, riskFilter, analisiSearch, analisiSort]);

    const concentracioFiltradaBase = useMemo(() => {
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

    const concentracioHistoric = useMemo(() =>
        orderConcentracio(
            concentracioFiltradaBase
                .filter(f => f.finestra === 'historic')
                .filter(f => riskFilter === 'TOTS' || f.nivell === riskFilter || (riskFilter === 'OBSERVACIO' && f.nivell === 'BAIX'))
        )
        , [concentracioFiltradaBase, orderConcentracio, riskFilter]);

    const concentracioSectorSnapshot = useMemo(() => {
        const items = [...concentracioHistoric]
            .sort((a, b) => (b.quota_import || 0) - (a.quota_import || 0))
            .slice(0, 6);
        const maxQuota = items.reduce((max, item) => Math.max(max, item.quota_import || 0), 0);
        return { items, maxQuota };
    }, [concentracioHistoric]);

    const concentracioTemporal = useMemo(() => {
        let result = concentracioFiltradaBase.filter(f => f.finestra !== 'historic');
        if (riskFilter !== 'TOTS') {
            result = result.filter(f => f.nivell === riskFilter || (riskFilter === 'OBSERVACIO' && f.nivell === 'BAIX'));
        }
        return orderConcentracio(result);
    }, [concentracioFiltradaBase, orderConcentracio, riskFilter]);

    const electoralFiltrats = useMemo(() => {
        let result = electoral.filter(f => f.nivell !== 'BAIX');
        if (riskFilter !== 'TOTS') {
            result = result.filter(f => f.nivell === riskFilter);
        }
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
    }, [electoral, riskFilter, analisiSearch, analisiSort]);

    useEffect(() => { setAnalisiPageFrac(1); setAnalisiPageElect(1); setAnalisiPageMonop(1); }, [riskFilter, analisiSearch, analisiSort]);
    useEffect(() => { setAnalisiPageFrac(1); setAnalisiPageElect(1); setAnalisiPageMonop(1); }, [analisiTab]);

    const totalPagesFrac = Math.max(1, Math.ceil(fraudesFiltrats.length / analisiItemsPerPage));
    const totalPagesElect = Math.max(1, Math.ceil(electoralFiltrats.length / analisiItemsPerPage));
    const totalPagesMonop = Math.max(1, Math.ceil(concentracioTemporal.length / analisiItemsPerPage));

    const fraudesPaginats = fraudesFiltrats.slice((analisiPageFrac - 1) * analisiItemsPerPage, analisiPageFrac * analisiItemsPerPage);
    const electoralPaginats = electoralFiltrats.slice((analisiPageElect - 1) * analisiItemsPerPage, analisiPageElect * analisiItemsPerPage);
    const concentracioPaginada = concentracioTemporal.slice((analisiPageMonop - 1) * analisiItemsPerPage, analisiPageMonop * analisiItemsPerPage);

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
        analisi: 'Anàlisi',
        'cas-fraccionament': 'Anàlisi',
        'cas-concentracio': 'Anàlisi',
        'cas-electoralisme': 'Anàlisi',
        sobre: 'Sobre',
        legal: 'Avís legal'
    }[activeTab] || 'Iguadata';

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
        setRiskFilter('TOTS');
        setAnalisiSort('risk-desc');
        setAnalisiPageFrac(1);
        setAnalisiPageMonop(1);
    };
    const activeAnalisiFiltersCount = (riskFilter !== 'TOTS' ? 1 : 0) + (analisiSort !== 'risk-desc' ? 1 : 0);

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
    }, [contracts]);

    const renderHomeChrome = (interactive = true) => (
        <div className="home-chrome">
            <div className="home-chrome-gradient is-visible" aria-hidden="true"></div>
            <div
                className="home-brand home-chrome-brand"
                onClick={interactive ? goToHome : undefined}
                onKeyDown={interactive ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        goToHome();
                    }
                } : undefined}
                role={interactive ? 'link' : undefined}
                tabIndex={interactive ? 0 : undefined}
            >
                <div className="home-logo" role="img" aria-label="Iguadata"></div>
            </div>
        </div>
    );

    const renderNavTabs = (showActive = true, useTransition = false) => {
        const handleNavClick = useTransition ? handleTransitionLinkClick : handleInternalLinkClick;
        const contractesActive = activeTab === 'buscador' || activeTab === 'contracte';
        const empresesActive = activeTab === 'empreses' || activeTab === 'empresa';
        const personesActive = activeTab === 'persones';
        const analisiActive = activeTab === 'analisi' || activeTab === 'cas-fraccionament' || activeTab === 'cas-concentracio' || activeTab === 'cas-electoralisme';
        const sobreActive = activeTab === 'sobre';
        return (
            <div className="nav">
                <a href={buildRouteUrl('/contractes')} className={'nav-tab' + (showActive && contractesActive ? ' active' : '')} aria-current={showActive && contractesActive ? 'page' : undefined} onClick={(event) => handleNavClick(event, () => { handleNavigation('buscador'); setSelectedEmpresa(null); setIsMobileMenuOpen(false); })}>Contractes</a>
                <a href={buildRouteUrl('/empreses')} className={'nav-tab' + (showActive && empresesActive ? ' active' : '')} aria-current={showActive && empresesActive ? 'page' : undefined} onClick={(event) => handleNavClick(event, () => { handleNavigation('empreses'); setSelectedEmpresa(null); setIsMobileMenuOpen(false); })}>Empreses</a>
                <a href={buildRouteUrl('/persones')} className={'nav-tab' + (showActive && personesActive ? ' active' : '')} aria-current={showActive && personesActive ? 'page' : undefined} onClick={(event) => handleNavClick(event, () => { handleNavigation('persones'); setIsMobileMenuOpen(false); })}>Persones</a>
                <a href={buildRouteUrl('/analisi')} className={'nav-tab' + (showActive && analisiActive ? ' active' : '')} aria-current={showActive && analisiActive ? 'page' : undefined} onClick={(event) => handleNavClick(event, handleAnalisiNavClick)}>Anàlisi</a>
                <a href={buildRouteUrl('/sobre')} className={'nav-tab' + (showActive && sobreActive ? ' active' : '')} aria-current={showActive && sobreActive ? 'page' : undefined} onClick={(event) => handleNavClick(event, () => { handleNavigation('sobre'); setIsMobileMenuOpen(false); })}>Sobre</a>
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

    const renderHomeSection = (extraClassName = '', interactive = true) => (
        <section className={`home${extraClassName ? ` ${extraClassName}` : ''}`} aria-label="Portada editorial Iguadata" aria-hidden={!interactive}>
            <div className="home-scroll-story">
                <div className="home-hero">
                    <canvas ref={homeCanvasRef} className="home-particles" aria-hidden="true"></canvas>
                    <div className="home-hero-bottom-gradient" aria-hidden="true"></div>

                    <div className="home-intro-scene">
                        <div className="home-copy">
                            <h1 className="home-title">Tot és <em>públic</em></h1>
                            <p className="home-deck">
                                Contractes, empreses, persones, imports i anàlisi en una cartografia oberta de la contractació pública de l'Ajuntament d'Igualada.
                            </p>
                        </div>

                        <div className="home-metrics" aria-label="Indicadors principals">
                            <a href={buildRouteUrl('/contractes')} className="home-metric metric-contractes" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('buscador'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive ? 0 : -1}>
                                <span className="home-metric-value">{contractCount.toLocaleString('ca-ES')}</span>
                                <span className="home-metric-label">Contractes</span>
                            </a>
                            <a href={buildRouteUrl('/contractes')} className="home-metric metric-import" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('buscador'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive ? 0 : -1}>
                                <span className="home-metric-value">{(importTotalTenths / 10).toLocaleString('ca-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M €</span>
                                <span className="home-metric-label">Imports</span>
                            </a>
                            <a href={buildRouteUrl('/empreses')} className="home-metric metric-empreses" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('empreses'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive ? 0 : -1}>
                                <span className="home-metric-value">{empresasCount.toLocaleString('ca-ES')}</span>
                                <span className="home-metric-label">Empreses</span>
                            </a>
                            <a href={buildRouteUrl('/persones')} className="home-metric metric-persones" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('persones'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive ? 0 : -1}>
                                <span className="home-metric-value">{personesCount.toLocaleString('ca-ES')}</span>
                                <span className="home-metric-label">Persones</span>
                            </a>
                            <a href={buildRouteUrl('/analisi')} className="home-metric metric-alertes" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, handleAnalisiNavClick)) : ((event) => event.preventDefault())} tabIndex={interactive ? 0 : -1}>
                                <span className="home-metric-value">{alertesCount.toLocaleString('ca-ES')}</span>
                                <span className="home-metric-label">Alertes</span>
                            </a>
                        </div>

                        <div className="home-scroll-invitation" aria-hidden="true">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </div>

                    <section className="home-chapter home-economic-scene" aria-labelledby="home-economic-title">
                        <div className="home-economic-heading">
                            <h2 id="home-economic-title">On van els <em>diners?</em></h2>
                            <p>Els sectors amb més despesa de l'Ajuntament d'Igualada.</p>
                        </div>
                        <div className="home-economic-bars" aria-label="Sectors amb més import adjudicat">
                            {homeTopSectors.map(item => (
                                <div
                                    key={item.label}
                                    className="home-economic-row"
                                    style={{ '--economic-scale': item.share }}
                                >
                                    <span>{item.label}</span>
                                    <strong>{formatCompactCurrency(item.amount)}</strong>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="home-chapter home-categories-scene" aria-labelledby="home-categories-title">
                        <div className="home-categories-cloud" aria-label="Categories amb més import adjudicat">
                            {homeTopCategories.map(item => (
                                <div
                                    key={item.label}
                                    className={`home-category-word home-category-word-${Math.min(item.rank, 6)}`}
                                    style={{ '--category-scale': 0.82 + item.share * 2.4 }}
                                >
                                    <span>{item.label}</span>
                                    <strong>{formatCompactCurrency(item.amount)}</strong>
                                </div>
                            ))}
                        </div>
                        <div className="home-categories-heading">
                            <h2 id="home-categories-title">Què es <em>compra</em>?</h2>
                            <p>Els serveis més contractats de l'Ajuntament d'Igualada.</p>
                        </div>
                    </section>

                    <section className="home-chapter home-patterns-scene" aria-labelledby="home-patterns-title">
                        <div className="home-patterns-heading">
                            <h2 id="home-patterns-title">I quan les dades es connecten, apareixen <em>patrons.</em></h2>
                        </div>
                        <div className="home-risk-metrics" aria-label="Alertes per nivell de risc">
                            <div className="home-risk-metric">
                                <strong>{homeRiskCounts.alt.toLocaleString('ca-ES')}</strong>
                                <span>Risc alt</span>
                            </div>
                            <div className="home-risk-metric">
                                <strong>{homeRiskCounts.mitja.toLocaleString('ca-ES')}</strong>
                                <span>Risc mitjà</span>
                            </div>
                            <div className="home-risk-metric">
                                <strong>{homeRiskCounts.baix.toLocaleString('ca-ES')}</strong>
                                <span>Risc baix</span>
                            </div>
                        </div>
                    </section>

                    <section className="home-chapter home-loop-scene" aria-labelledby="home-loop-title">
                        <div className="home-loop-copy">
                            <h2 id="home-loop-title" className="home-loop-title">El projecte de transparència <em>d'Igualada</em></h2>
                        </div>
                    </section>
                </div>
            </div>
        </section>
    );

    const renderLegacyHomeSection = (extraClassName = '', interactive = true) => (
        <section className={`home${extraClassName ? ` ${extraClassName}` : ''}`} aria-label="Portada editorial Iguadata" aria-hidden={!interactive}>
            <div className="home-hero">
            <canvas ref={homeCanvasRef} className="home-particles" aria-hidden="true"></canvas>
            <div className="home-hero-bottom-gradient" aria-hidden="true"></div>
            <div className="home-copy">
                <h1 className="home-title">Tot és <em>públic</em></h1>
                <p className="home-deck">
                    Contractes, empreses, persones, imports i anàlisi en una cartografia oberta de la contractació pública de l'Ajuntament d'Igualada.
                </p>
            </div>

            <div className="home-metrics" aria-label="Indicadors principals">
                <a href={buildRouteUrl('/contractes')} className="home-metric metric-contractes" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('buscador'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive && !isMobile() ? 0 : -1}>
                    <span className="home-metric-value">{contractCount.toLocaleString('ca-ES')}</span>
                    <span className="home-metric-label">Contractes</span>
                </a>
                <a href={buildRouteUrl('/contractes')} className="home-metric metric-import" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('buscador'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive && !isMobile() ? 0 : -1}>
                    <span className="home-metric-value">{(importTotalTenths / 10).toLocaleString('ca-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M €</span>
                    <span className="home-metric-label">Imports</span>
                </a>
                <a href={buildRouteUrl('/empreses')} className="home-metric metric-empreses" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('empreses'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive && !isMobile() ? 0 : -1}>
                    <span className="home-metric-value">{empresasCount.toLocaleString('ca-ES')}</span>
                    <span className="home-metric-label">Empreses</span>
                </a>
                <a href={buildRouteUrl('/persones')} className="home-metric metric-persones" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('persones'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive && !isMobile() ? 0 : -1}>
                    <span className="home-metric-value">{personesCount.toLocaleString('ca-ES')}</span>
                    <span className="home-metric-label">Persones</span>
                </a>
                <a href={buildRouteUrl('/analisi')} className="home-metric metric-alertes" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, handleAnalisiNavClick)) : ((event) => event.preventDefault())} tabIndex={interactive && !isMobile() ? 0 : -1}>
                    <span className="home-metric-value">{alertesCount.toLocaleString('ca-ES')}</span>
                    <span className="home-metric-label">Alertes</span>
                </a>
            </div>
            </div>

            <div id="dades" className="home-landing" aria-label="Dades destacades">
                <div className="home-atlas" style={{ '--atlas-panels': 4 }}>
                    <div className="home-atlas-sticky">
                        <div className="home-atlas-rail" aria-hidden="true">
                            {Array.from({ length: 4 }, (_, index) => (
                                <span key={index}>{String(index + 1).padStart(2, '0')}</span>
                            ))}
                        </div>
                        <div className="home-atlas-track">
                            <section className="home-story home-atlas-panel home-story-manifest">
                                <h2>Una manera nova de mirar Igualada</h2>
                                <div className="home-manifest-copy">
                                    <p>Una dada pot ser pública i continuar sent invisible. Un contracte pot estar penjat en un registre oficial i no explicar res a ningú.</p>
                                    <p>Iguadata ordena la contractació municipal perquè contractes, empreses, imports, persones vinculades i alertes es puguin llegir com un mapa.</p>
                                    <p>No substitueix el periodisme, l'activa: converteix informació dispersa i tècnica en una infraestructura cívica per preguntar millor com circulen els diners públics.</p>
                                </div>
                            </section>

                            <section className="home-story home-atlas-panel home-story-minors">
                                <div className="home-story-header">
                                    <h2>El pes del contracte menor</h2>
                                    <p>No tots els contractes menors són problemàtics. Però mirar-ne l'evolució ajuda a entendre com es contracta.</p>
                                </div>
                                <div className="home-minors-chart" aria-label="Percentatge anual de contractes menors">
                                    {homeMinorContractTrend.map(item => (
                                        <div key={item.year} className="home-minors-bar" style={{ '--minor-scale': item.barScale }}>
                                            <span className="home-minors-value">{item.percentLabel}</span>
                                            <span className="home-minors-fill" aria-hidden="true"></span>
                                            <span className="home-minors-year">{item.year}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="home-story home-atlas-panel home-story-sectors">
                                <div className="home-story-header">
                                    <h2>On van els diners?</h2>
                                    <p>Els sectors que concentren més contractes.</p>
                                </div>
                                <div className="home-sector-bars" aria-label="Sectors amb més import adjudicat">
                                    {homeTopSectors.map(item => (
                                        <a
                                            key={item.label}
                                            href={buildRouteUrl('/empreses')}
                                            className="home-sector-row"
                                            style={{ '--bar-scale': item.share }}
                                            onClick={interactive ? ((event) => handleInternalLinkClick(event, () => { setEmpresesSector(item.label); setEmpresesCategoria(''); setEmpresesPage(1); handleNavigation('empreses', '/empreses', { keepFilters: true }); })) : ((event) => event.preventDefault())}
                                            tabIndex={interactive ? 0 : -1}
                                        >
                                            <span className="home-sector-rank">{String(item.rank).padStart(2, '0')}</span>
                                            <span className="home-sector-name">{item.label}</span>
                                            <span className="home-sector-amount">{formatCompactCurrency(item.amount)}</span>
                                        </a>
                                    ))}
                                </div>
                            </section>

                            <section className="home-story home-atlas-panel home-story-categories">
                                <div className="home-category-cloud" aria-label="Categories amb més import adjudicat">
                                    {homeTopCategories.map(item => (
                                        <a
                                            key={item.label}
                                            href={buildRouteUrl('/empreses')}
                                            className={`home-category-chip home-category-chip-${Math.min(item.rank, 6)}`}
                                            style={{ '--chip-scale': 0.72 + item.share * 2.8 }}
                                            onClick={interactive ? ((event) => handleInternalLinkClick(event, () => { setEmpresesCategoria(item.label); setEmpresesSector(''); setEmpresesPage(1); handleNavigation('empreses', '/empreses', { keepFilters: true }); })) : ((event) => event.preventDefault())}
                                            tabIndex={interactive ? 0 : -1}
                                        >
                                            <span>{item.label}</span>
                                            <strong>{formatCompactCurrency(item.amount)}</strong>
                                        </a>
                                    ))}
                                </div>
                                <div className="home-story-header home-story-header-offset">
                                    <h2>Què compra l'Ajuntament?</h2>
                                    <p>Categories fàcils de llegir, no codis opacs.</p>
                                </div>
                            </section>

                        </div>
                    </div>
                </div>

                <section className="home-story home-story-trust">
                    <div className="home-trust-strip">
                        <div>
                            <span>Última actualització</span>
                            <strong>{summary?.generated_at ? formatDate(summary.generated_at.slice(0, 10)) : 'Automàtica'}</strong>
                        </div>
                        <div>
                            <span>Fonts</span>
                            <strong>Socrata · BORME</strong>
                        </div>
                        <div>
                            <span>Lectura responsable</span>
                            <strong>Les alertes no impliquen irregularitat</strong>
                        </div>
                    </div>
                </section>
            </div>
        </section>
    );

    const renderHomeLoading = (isDissolving = false) => (
        <div className={`home home-loading-screen${isDissolving ? ' is-dissolving' : ''}`}>
            <div className="home-brand">
                <div className="home-logo" role="img" aria-label="Iguadata"></div>
            </div>
            {!isDissolving && <canvas ref={homeCanvasRef} className="home-particles" aria-hidden="true"></canvas>}
            <div className="home-copy home-loading-copy">
                <h1 className="home-title">Tot és <em>públic</em></h1>
                <div className="home-loading-progress">
                    {loadingProgress.toLocaleString('ca-ES')}%
                </div>
            </div>
        </div>
    );

    const dataTabs = ['buscador', 'empreses', 'persones', 'contracte', 'empresa', 'analisi', 'cas-fraccionament', 'cas-concentracio', 'cas-electoralisme'];
    const analisiTabs = ['analisi', 'cas-fraccionament', 'cas-concentracio', 'cas-electoralisme'];
    const activeDataError =
        (dataTabs.includes(activeTab) && coreDataError) ||
        (activeTab === 'persones' && personesError) ||
        (activeTab === 'empresa' && administradorsError) ||
        (analisiTabs.includes(activeTab) && analisiError);
    const isSupplementalDataLoading =
        (activeTab === 'persones' && !personesLoaded) ||
        (activeTab === 'empresa' && !administradorsLoaded) ||
        (analisiTabs.includes(activeTab) && !analisiLoaded);
    const isDataTabLoading = dataTabs.includes(activeTab) && (dataLoading || isSupplementalDataLoading);
    const canRenderDataTab = !isDataTabLoading && !activeDataError;
    const retryActiveData = () => {
        if (coreDataError) {
            setCoreRetry(value => value + 1);
            return;
        }
        if (activeTab === 'persones') {
            setPersonesLoaded(false);
            setPersonesError(false);
            setPersonesRetry(value => value + 1);
            return;
        }
        if (activeTab === 'empresa') {
            setAdministradorsLoaded(false);
            setAdministradorsError(false);
            setAdministradorsRetry(value => value + 1);
            return;
        }
        if (analisiTabs.includes(activeTab)) {
            setAnalisiLoaded(false);
            setAnalisiError(false);
            setAnalisiRetry(value => value + 1);
        }
    };
    const renderSkeletonCard = (className = '') => (
        <div className={`contract-card data-skeleton-card${className ? ` ${className}` : ''}`} aria-hidden="true">
            <div className="data-skeleton-line data-skeleton-line-short"></div>
            <div className="data-skeleton-line data-skeleton-line-title"></div>
            <div className="data-skeleton-line"></div>
            <div className="data-skeleton-line data-skeleton-line-medium"></div>
        </div>
    );
    const renderDataLoading = () => {
        const isAnalisiLoading = analisiTabs.includes(activeTab);
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
        return renderHomeLoading(false);
    }

    const handleDetailClick = (contract) => {
        setSelectedContractForDetail(contract);
        handleNavigation('contracte', `/contractes/${contract.slug}`);
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
        const tabs = ['fraccionament', 'monopoli', 'electoral'];
        const currentIndex = tabs.indexOf(analisiTab);
        let nextIndex = currentIndex;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        setAnalisiTab(tabs[nextIndex]);
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
                    {renderHomeChrome()}
                    <main id="main-content" className="home-dissolve-stage">
                        {renderHomeSection(homeIntroFading ? 'home-intro-target' : '')}
                        {homeIntroFading && renderHomeLoading(true)}
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
                        <div className="search-input-wrapper">
                            <span className="search-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Cerca per descripció, empresa o codi d'expedient"
                                aria-label="Cerca per descripció, empresa o codi d'expedient"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button className="search-clear" onClick={() => setSearchTerm('')} type="button" aria-label="Netejar cerca">&times;</button>
                            )}
                        </div>

                        <FilterActions
                            open={filtersOpen}
                            onToggle={() => setFiltersOpen(prev => !prev)}
                            activeCount={activeFiltersCount}
                            onReset={resetFilters}
                        />

                        <div className={"filters search-filter-panel" + (!filtersOpen ? " collapsed" : "")}>
                            <div className="filter-group" style={{ flex: '1 1 200px' }}>
                                <label className="filter-label">Ordenar per</label>
                                <select className="filter-select" style={{ height: '48px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar contractes per">
                                    <option value="date-desc">Data (més recents)</option>
                                    <option value="date-asc">Data (més antics)</option>
                                    <option value="amount-desc">Import (descendent)</option>
                                    <option value="amount-asc">Import (ascendent)</option>
                                </select>
                            </div>
                            <div className="filter-group" style={{ flex: '1 1 200px' }}>
                                <label className="filter-label">Procediment</label>
                                <select className="filter-select" style={{ height: '48px' }} value={procedureFilter} onChange={(e) => setProcedureFilter(e.target.value)} aria-label="Procediment">
                                    <option value="">Tots els procediments</option>
                                    <option value="Menor">Menor</option>
                                    <option value="Obert">Obert</option>
                                    <option value="Negociat sense publicitat">Negociat sense publicitat</option>
                                    <option value="Licitació amb negociació">Licitació amb negociació</option>
                                    <option value="Adjudicacions directes no menors">Adjudicació directa</option>
                                    <option value="Específic de sistema dinàmic de contractació">Sistema dinàmic</option>
                                </select>
                            </div>
                            <div className="filter-group" style={{ flex: '1 1 200px' }}>
                                <label className="filter-label">Tipus</label>
                                <select className="filter-select" style={{ height: '48px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Tipus de contracte">
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

                        <div className={"filters-row search-filter-panel search-filter-panel-secondary" + (!filtersOpen ? " collapsed" : "")}>
                            <div className="filter-group">
                                <label className="filter-label">Data inici</label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    aria-label="Data inici"
                                    value={dateStart}
                                    onChange={(e) => setDateStart(e.target.value)}
                                />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Data final</label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    aria-label="Data final"
                                    value={dateEnd}
                                    onChange={(e) => setDateEnd(e.target.value)}
                                />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Des de</label>
                                <input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import mínim" aria-label="Import mínim" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Fins a</label>
                                <input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import màxim" aria-label="Import màxim" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="results-count">
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
                                    <div className="contract-pills">
                                        <span className="contract-pill">{formatTipus(c.tipo)}</span>
                                        <span className="contract-pill procedure">{formatProcediment(c.procedimiento)}</span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    ))}

                    {contractesFiltrats.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                            <div className="empty-state-title">Sense resultats</div>
                            <div className="empty-state-text">No s'han trobat contractes.</div>
                            <div className="empty-state-action">
                                <button className="empty-state-btn" onClick={resetFilters}>Restablir filtres</button>
                            </div>
                        </div>
                    )}

                    {contractesFiltrats.length > itemsPerPage && (
                        <div className="pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={currentPage === 1}
                                title="Primera pàgina"
                            >
                                «
                            </button>
                            <button
                                className="pagination-btn"
                                onClick={() => { setCurrentPage(currentPage - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={currentPage === 1}
                                title="Pàgina anterior"
                            >
                                ‹
                            </button>

                            <span className="pagination-info">
                                Pàgina <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                            </span>

                            <button
                                className="pagination-btn"
                                onClick={() => { setCurrentPage(currentPage + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={currentPage === totalPages}
                                title="Pàgina següent"
                            >
                                ›
                            </button>
                            <button
                                className="pagination-btn"
                                onClick={() => { setCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={currentPage === totalPages}
                                title="Última pàgina"
                            >
                                »
                            </button>
                        </div>
                    )}

                    {contractesAnnualEvolution.items.length > 0 && (
                        <div className="contract-evolution-visual" aria-label="Evolució anual de l'import adjudicat">
                            <div className="contract-evolution-header">
                                <div>
                                    <div className="chart-kicker">Visualització</div>
                                    <h3>Històric de contractació</h3>
                                </div>
                            </div>

                            <div className="contract-evolution-bars">
                                {contractesAnnualEvolution.items.map(item => (
                                    <button
                                        key={item.year}
                                        type="button"
                                        className={"contract-evolution-column" + (dateStart === `${item.year}-01-01` && dateEnd === `${item.year}-12-31` ? " is-active" : "")}
                                        onClick={() => {
                                            setSearchTerm('');
                                            setDebouncedSearch('');
                                            setTypeFilter('');
                                            setProcedureFilter('');
                                            setAmountMin('');
                                            setAmountMax('');
                                            setSortBy('date-desc');
                                            setDateStart(`${item.year}-01-01`);
                                            setDateEnd(`${item.year}-12-31`);
                                            setCurrentPage(1);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        aria-label={`Filtrar contractes de l'any ${item.year}`}
                                    >
                                        <div className="contract-evolution-bar-wrap" aria-hidden="true">
                                            <span style={{ height: `${Math.max(4, Math.round((item.amount / contractesAnnualEvolution.maxAmount) * 100))}%`, '--bar-width': `${Math.max(4, Math.round((item.amount / contractesAnnualEvolution.maxAmount) * 100))}%` }}></span>
                                        </div>
                                        <div className="contract-evolution-meta">
                                            <span>{item.year}</span>
                                            <small>{formatCurrency(item.amount)}</small>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
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

            {activeTab === 'contracte' && selectedContractForDetail && canRenderDataTab && (
                <ContractDetailView
                    contract={selectedContractForDetail}
                    contracts={contracts}
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

            {activeTab === 'analisi' && canRenderDataTab && (
                <>
                    <div className={'analisi-tabs-wrapper' + (!isPageTop ? ' is-hidden-on-scroll' : '')}>
                        <div className="analisi-tabs" role="tablist" aria-label="Tipus d'anàlisi">
                        <button
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
                            onClick={() => setAnalisiTab('monopoli')}
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
                        </div>
                    </div>

                    <div
                        className={`container analisi-page analisi-page-reordered analisi-page-${analisiTab}${analisiTab === 'monopoli' ? ` concentracio-mode-${concentracioMode}` : ''}`}
                        id="analisi-panel"
                        role="tabpanel"
                    >
                        <h1 className="page-title">
                            {analisiTab === 'fraccionament'
                                ? 'Anàlisi de fraccionament'
                                : analisiTab === 'monopoli'
                                    ? 'Anàlisi de concentració'
                                    : "Anàlisi d'electoralisme"}
                        </h1>

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
                                    <div className="search-input-wrapper">
                                        <span className="search-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                        </span>
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder="Cerca per descripció, empresa o codi de cas"
                                            aria-label="Cerca casos de fraccionament"
                                            value={analisiSearch}
                                            onChange={(e) => setAnalisiSearch(e.target.value)}
                                        />
                                        {analisiSearch && (
                                            <button className="search-clear" onClick={() => setAnalisiSearch('')} type="button" aria-label="Netejar cerca">&times;</button>
                                        )}
                                    </div>

                                    <FilterActions
                                        open={analisiFiltersOpen}
                                        onToggle={() => setAnalisiFiltersOpen(prev => !prev)}
                                        activeCount={activeAnalisiFiltersCount}
                                        onReset={resetAnalisiFilters}
                                    />

                                    <div className={"filters search-filter-panel search-filter-panel-analysis" + (!analisiFiltersOpen ? " collapsed" : "")}>
                                        <div className="filter-group" style={{ flex: '1 1 240px' }}>
                                            <label className="filter-label">Ordenar per</label>
                                            <select className="filter-select" style={{ height: '48px' }} value={analisiSort} onChange={(e) => setAnalisiSort(e.target.value)} aria-label="Ordenar casos de fraccionament per">
                                                <option value="risk-desc">Puntuació de risc (descendent)</option>
                                                <option value="risk-asc">Puntuació de risc (ascendent)</option>
                                                <option value="amount-desc">Import (descendent)</option>
                                                <option value="amount-asc">Import (ascendent)</option>
                                                <option value="date-desc">Data (més recents)</option>
                                                <option value="date-asc">Data (més antics)</option>
                                            </select>
                                        </div>
                                        <div className="filter-group analisi-risk-filter-group" style={{ flex: '1 1 280px' }}>
                                            <label className="filter-label">Risc</label>
                                            <div className="analisi-risk-filters">
                                                <button className={'analisi-filter-btn analisi-filter-all' + (riskFilter === 'TOTS' ? ' active' : '')} onClick={() => setRiskFilter('TOTS')} type="button">
                                                    Tots
                                                </button>
                                                {[
                                                    ['CRITIC', 'Alt'],
                                                    ['ALT', 'Mitjà'],
                                                    ['OBSERVACIO', 'Baix'],
                                                ].map(([value, label]) => (
                                                    <button key={value} className={'analisi-filter-btn risk-' + riskClass(value) + (riskFilter === value ? ' active' : '')} onClick={() => setRiskFilter(value)} type="button">
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="results-count">
                                    <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{fraudesFiltrats.length}</strong> alertes</span>
                                    {fraudesFiltrats.length > analisiItemsPerPage && (
                                        <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{analisiPageFrac}</strong> de <strong>{totalPagesFrac}</strong></span>
                                    )}
                                </div>

                                <div className="analisi-alert-list">
                                    {fraudesPaginats.map(caso => (
                                        <a key={caso.id} href={buildRouteUrl(`/analisi/fraccionament/${caso.id}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => handleCasoClick(caso))}>
                                            <div className="contract-card fraccionament-card">
                                                <div className="contract-header">
                                                    <div className="contract-title">{(caso.empreses || []).slice(0, 2).join(' & ')}</div>
                                                    <div className="contract-amount">{formatCurrency(caso.import_total)}</div>
                                                </div>
                                                <div className="contract-meta fraccionament-alert-meta">
                                                    <div className="contract-meta-item fraccionament-card-object">
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

                                {fraudesFiltrats.length > analisiItemsPerPage && (
                                    <div className="pagination">
                                        <button className="pagination-btn" onClick={() => { setAnalisiPageFrac(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageFrac === 1} title="Primera pàgina">«</button>
                                        <button className="pagination-btn" onClick={() => { setAnalisiPageFrac(prev => Math.max(prev - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageFrac === 1} title="Pàgina anterior">‹</button>
                                        <span className="pagination-info">Pàgina <strong>{analisiPageFrac}</strong> de <strong>{totalPagesFrac}</strong></span>
                                        <button className="pagination-btn" onClick={() => { setAnalisiPageFrac(prev => Math.min(prev + 1, totalPagesFrac)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageFrac === totalPagesFrac} title="Pàgina següent">›</button>
                                        <button className="pagination-btn" onClick={() => { setAnalisiPageFrac(totalPagesFrac); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageFrac === totalPagesFrac} title="Última pàgina">»</button>
                                    </div>
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

                                {concentracioSectorSnapshot.items.length > 0 && (
                                    <div className="sector-concentration-visual" aria-label="Sectors amb més concentració d'adjudicacions">
                                        <div className="sector-concentration-header">
                                            <div>
                                                <div className="chart-kicker">Visualització</div>
                                                <h3>Concentració de contractes</h3>
                                            </div>
                                        </div>

                                        <div className="sector-concentration-bars">
                                            {concentracioSectorSnapshot.items.map(caso => (
                                                <div key={`snapshot-${caso.id}`} className="sector-concentration-row">
                                                    <div className="sector-concentration-copy">
                                                        <span>{formatSectorName(caso.sector)}</span>
                                                        <small>{(caso.empreses || []).slice(0, 2).join(' · ')}</small>
                                                    </div>
                                                    <div className="sector-concentration-track" aria-hidden="true">
                                                        <span style={{ width: `${Math.max(4, Math.round((caso.quota_import || 0) * 100))}%` }}></span>
                                                    </div>
                                                    <div className="sector-concentration-value">
                                                        <span>{formatPercent(caso.quota_import)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="concentracio-mode-switch" role="group" aria-label="Tipus de concentració">
                                    <button
                                        type="button"
                                        className={'concentracio-mode-btn' + (concentracioMode === 'historic' ? ' active' : '')}
                                        onClick={() => setConcentracioMode('historic')}
                                    >
                                        Sectors
                                    </button>
                                    <button
                                        type="button"
                                        className={'concentracio-mode-btn' + (concentracioMode === 'temporal' ? ' active' : '')}
                                        onClick={() => setConcentracioMode('temporal')}
                                    >
                                        Temporals
                                    </button>
                                </div>

                                <div className="search-section analisi-search-section">
                                        <div className="search-input-wrapper">
                                            <span className="search-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                            </span>
                                            <input
                                                type="text"
                                                className="search-input"
                                                placeholder="Cerca per descripció, empresa o codi de cas"
                                                aria-label="Cerca casos de concentració"
                                                value={analisiSearch}
                                                onChange={(e) => setAnalisiSearch(e.target.value)}
                                            />
                                            {analisiSearch && (
                                                <button className="search-clear" onClick={() => setAnalisiSearch('')} type="button" aria-label="Netejar cerca">&times;</button>
                                            )}
                                        </div>

                                        <FilterActions
                                            open={analisiFiltersOpen}
                                            onToggle={() => setAnalisiFiltersOpen(prev => !prev)}
                                            activeCount={activeAnalisiFiltersCount}
                                            onReset={resetAnalisiFilters}
                                        />

                                        <div className={"filters search-filter-panel search-filter-panel-analysis" + (!analisiFiltersOpen ? " collapsed" : "")}>
                                            <div className="filter-group" style={{ flex: '1 1 240px' }}>
                                                <label className="filter-label">Ordenar per</label>
                                                <select className="filter-select" style={{ height: '48px' }} value={analisiSort} onChange={(e) => setAnalisiSort(e.target.value)} aria-label="Ordenar casos de concentració per">
                                                    <option value="risk-desc">Puntuació de risc (descendent)</option>
                                                    <option value="risk-asc">Puntuació de risc (ascendent)</option>
                                                    <option value="amount-desc">Import (descendent)</option>
                                                    <option value="amount-asc">Import (ascendent)</option>
                                                    <option value="date-desc">Data (més recents)</option>
                                                    <option value="date-asc">Data (més antics)</option>
                                                </select>
                                            </div>
                                            <div className="filter-group analisi-risk-filter-group" style={{ flex: '1 1 280px' }}>
                                                <label className="filter-label">Risc</label>
                                                <div className="analisi-risk-filters">
                                                    <button className={'analisi-filter-btn analisi-filter-all' + (riskFilter === 'TOTS' ? ' active' : '')} onClick={() => setRiskFilter('TOTS')} type="button">Tots</button>
                                                    {[
                                                        ['CRITIC', 'Alt'],
                                                        ['ALT', 'Mitjà'],
                                                        ['OBSERVACIO', 'Baix'],
                                                    ].map(([value, label]) => (
                                                        <button key={value} className={'analisi-filter-btn risk-' + riskClass(value) + (riskFilter === value ? ' active' : '')} onClick={() => setRiskFilter(value)} type="button">
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                </div>

                                {concentracioMode === 'historic' && (
                                    <>
                                        <div className="analisi-alert-list">
                                            {concentracioHistoric.map(caso => (
                                                <a key={caso.id} href={buildRouteUrl(`/analisi/concentracio/${caso.id}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => handleConcentracioClick(caso))}>
                                                    <div className="contract-card concentracio-card concentracio-card-historic">
                                                        <div className="analysis-card-title">{formatSectorName(caso.sector)}</div>
                                                        <div className="analysis-card-main">
                                                            <div className="concentracio-card-company">
                                                                <span className="contract-meta-label">Empresa dominant</span>
                                                                <span className="contract-meta-value">{(caso.empreses || []).slice(0, 2).join(' · ')}</span>
                                                            </div>
                                                            <div className="contract-amount">{formatPercent(caso.quota_import)}</div>
                                                        </div>
                                                        <div className="contract-meta concentracio-card-meta">
                                                            <div className="contract-meta-item">
                                                                <span className="contract-meta-label">Import</span>
                                                                <span className="contract-meta-value">{formatCurrency(caso.import_concentrat)} / {formatCurrency(caso.import_sector)}</span>
                                                            </div>
                                                            <div className="contract-meta-item">
                                                                <span className="contract-meta-label">Contractes</span>
                                                                <span className="contract-meta-value">{caso.contractes_concentrats} / {caso.contractes_sector}</span>
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
                                        <div className="results-count">
                                            <span className="results-count-total">S'han trobat <strong>{concentracioTemporal.length}</strong> concentracions</span>
                                            {concentracioTemporal.length > analisiItemsPerPage && (
                                                <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{analisiPageMonop}</strong> de <strong>{totalPagesMonop}</strong></span>
                                            )}
                                        </div>

                                        <div className="analisi-alert-list">
                                            {concentracioPaginada.map(caso => (
                                                <a key={caso.id} href={buildRouteUrl(`/analisi/concentracio/${caso.id}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => handleConcentracioClick(caso))}>
                                                    <div className="contract-card concentracio-card concentracio-card-temporal">
                                                        <div className="analysis-card-title">{formatSectorName(caso.sector)}</div>
                                                        <div className="analysis-card-main">
                                                            <div className="concentracio-card-company">
                                                                <span className="contract-meta-label">{caso.tipus_concentracio === 'xarxa' ? 'Xarxa mercantil' : 'Empresa dominant'}</span>
                                                                <span className="contract-meta-value">{(caso.empreses || []).slice(0, 2).join(' · ')}</span>
                                                            </div>
                                                            <div className="contract-amount">{formatCurrency(caso.import_concentrat)}</div>
                                                        </div>
                                                        <div className="contract-meta concentracio-card-meta">
                                                            <div className="contract-meta-item">
                                                                <span className="contract-meta-label">Període</span>
                                                                <span className="contract-meta-value">Del {formatDate(caso.data_inici)} al {formatDate(caso.data_fi)}</span>
                                                            </div>
                                                            <div className="contract-meta-item">
                                                                <span className="contract-meta-label">Contractes</span>
                                                                <span className="contract-meta-value">{caso.contractes_concentrats} / {caso.contractes_sector}</span>
                                                            </div>
                                                            <div className="contract-meta-item">
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

                                        {concentracioTemporal.length > analisiItemsPerPage && (
                                            <div className="pagination">
                                                <button className="pagination-btn" onClick={() => { setAnalisiPageMonop(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageMonop === 1} title="Primera pàgina">«</button>
                                                <button className="pagination-btn" onClick={() => { setAnalisiPageMonop(prev => Math.max(prev - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageMonop === 1} title="Pàgina anterior">‹</button>
                                                <span className="pagination-info">Pàgina <strong>{analisiPageMonop}</strong> de <strong>{totalPagesMonop}</strong></span>
                                                <button className="pagination-btn" onClick={() => { setAnalisiPageMonop(prev => Math.min(prev + 1, totalPagesMonop)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageMonop === totalPagesMonop} title="Pàgina següent">›</button>
                                                <button className="pagination-btn" onClick={() => { setAnalisiPageMonop(totalPagesMonop); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageMonop === totalPagesMonop} title="Última pàgina">»</button>
                                            </div>
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
                                    <div className="search-input-wrapper">
                                        <span className="search-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                        </span>
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder="Cerca per descripció, empresa o codi de cas"
                                            aria-label="Cerca casos d'electoralisme"
                                            value={analisiSearch}
                                            onChange={(e) => setAnalisiSearch(e.target.value)}
                                        />
                                        {analisiSearch && (
                                            <button className="search-clear" onClick={() => setAnalisiSearch('')} type="button" aria-label="Netejar cerca">&times;</button>
                                        )}
                                    </div>

                                    <FilterActions
                                        open={analisiFiltersOpen}
                                        onToggle={() => setAnalisiFiltersOpen(prev => !prev)}
                                        activeCount={activeAnalisiFiltersCount}
                                        onReset={resetAnalisiFilters}
                                    />

                                    <div className={"filters search-filter-panel search-filter-panel-analysis" + (!analisiFiltersOpen ? " collapsed" : "")}>
                                        <div className="filter-group" style={{ flex: '1 1 240px' }}>
                                            <label className="filter-label">Ordenar per</label>
                                            <select className="filter-select" style={{ height: '48px' }} value={analisiSort} onChange={(e) => setAnalisiSort(e.target.value)} aria-label="Ordenar casos d'electoralisme per">
                                                <option value="risk-desc">Puntuació de risc (descendent)</option>
                                                <option value="risk-asc">Puntuació de risc (ascendent)</option>
                                                <option value="amount-desc">Import (descendent)</option>
                                                <option value="amount-asc">Import (ascendent)</option>
                                                <option value="date-desc">Data (més recents)</option>
                                                <option value="date-asc">Data (més antics)</option>
                                            </select>
                                        </div>
                                        <div className="filter-group analisi-risk-filter-group" style={{ flex: '1 1 280px' }}>
                                            <label className="filter-label">Risc</label>
                                            <div className="analisi-risk-filters">
                                                <button className={'analisi-filter-btn analisi-filter-all' + (riskFilter === 'TOTS' ? ' active' : '')} onClick={() => setRiskFilter('TOTS')} type="button">Tots</button>
                                                {[
                                                    ['CRITIC', 'Alt'],
                                                    ['ALT', 'Mitjà'],
                                                    ['OBSERVACIO', 'Baix'],
                                                ].map(([value, label]) => (
                                                    <button key={value} className={'analisi-filter-btn risk-' + riskClass(value) + (riskFilter === value ? ' active' : '')} onClick={() => setRiskFilter(value)} type="button">
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="results-count">
                                    <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{electoralFiltrats.length}</strong> alertes</span>
                                    {electoralFiltrats.length > analisiItemsPerPage && (
                                        <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{analisiPageElect}</strong> de <strong>{totalPagesElect}</strong></span>
                                    )}
                                </div>

                                <div className="analisi-alert-list">
                                    {electoralPaginats.map(caso => {
                                        const cc = (caso.contractes && caso.contractes[0]) || {};
                                        const href = buildRouteUrl(`/analisi/electoralisme/${caso.id}`);
                                        const isPreElectoral = caso.fase_temporal === 'Finestra administrativa prèvia';
                                        const isPostElectoral = caso.fase_temporal === 'Finestra administrativa posterior';
                                        const temporalLabel = isPreElectoral ? 'Dies abans' : (isPostElectoral ? 'Dies després' : 'Votació en');
                                        const temporalValue = isPreElectoral ? (caso.dies_abans_convocatoria || 0) : (isPostElectoral ? (caso.dies_despres_votacio || 0) : caso.dies_fins_votacio);
                                        return (
                                            <a key={caso.id} href={href} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => handleElectoralismeClick(caso))}>
                                                <div className="contract-card fraccionament-card electoralisme-card">
                                                    <div className="analysis-card-title">{caso.empresa}</div>
                                                    <div className="analysis-card-main">
                                                        <div className="fraccionament-card-object">
                                                            <span className="contract-meta-label">Objecte</span>
                                                            <span className="contract-meta-value">{cc.descripcion || ''}</span>
                                                        </div>
                                                        <div className="contract-amount">{formatCurrency(caso.import_total)}</div>
                                                    </div>
                                                    <div className="contract-meta fraccionament-card-meta">
                                                        <div className="contract-meta-item">
                                                            <span className="contract-meta-label">Període</span>
                                                            <span className="contract-meta-value">{caso.periode_electoral}</span>
                                                        </div>
                                                        <div className="contract-meta-item">
                                                            <span className="contract-meta-label">Data</span>
                                                            <span className="contract-meta-value">{formatDate(caso.data_inici)}</span>
                                                        </div>
                                                        <div className="contract-meta-item">
                                                            <span className="contract-meta-label">{temporalLabel}</span>
                                                            <span className="contract-meta-value">{temporalValue} dies</span>
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

                                {electoralFiltrats.length > analisiItemsPerPage && (
                                    <div className="pagination">
                                        <button className="pagination-btn" onClick={() => { setAnalisiPageElect(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageElect === 1} title="Primera pàgina">«</button>
                                        <button className="pagination-btn" onClick={() => { setAnalisiPageElect(prev => Math.max(prev - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageElect === 1} title="Pàgina anterior">‹</button>
                                        <span className="pagination-info">Pàgina <strong>{analisiPageElect}</strong> de <strong>{totalPagesElect}</strong></span>
                                        <button className="pagination-btn" onClick={() => { setAnalisiPageElect(prev => Math.min(prev + 1, totalPagesElect)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageElect === totalPagesElect} title="Pàgina següent">›</button>
                                        <button className="pagination-btn" onClick={() => { setAnalisiPageElect(totalPagesElect); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={analisiPageElect === totalPagesElect} title="Última pàgina">»</button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )
            }

            {
                activeTab === 'sobre' && (
                    <div className="container prose-page">
                        <h1 className="page-title">Sobre el projecte</h1>
                        <div className="prose-wrapper">
                            <p className="prose-intro">
                                Iguadata és la plataforma independent de periodisme de dades per a l'anàlisi de la contractació pública de l'Ajuntament d'Igualada i dels seus organismes municipals.<br /><br />El projecte combina dades obertes de contractació, informació mercantil i algoritmes propis per fer més accessible, comprensible i fiscalitzable la despesa pública municipal.
                            </p>
                            <h2 className="prose-heading">Autoria</h2>
                            <p className="prose-paragraph">
                                Iguadata és un projecte de l'igualadí <a href="https://x.com/viictxxr" target="_blank" rel="noopener noreferrer" className="prose-link">Víctor Recio Rodríguez</a>, desenvolupat com a Treball Final del Màster en Periodisme i Comunicació Digital: Dades i Noves Narratives de la Universitat Oberta de Catalunya (UOC), sota la tutoria de Carlos López Olano.
                            </p>
                            <h2 className="prose-heading">Objectius</h2>
                            <p className="prose-paragraph">
                                Iguadata neix amb tres objectius principals: facilitar l'accés de la ciutadania a la contractació pública municipal, detectar patrons que puguin merèixer revisió periodística o institucional, i construir una metodologia replicable per altres municipis.
                            </p>
                            <p className="prose-paragraph">
                                La plataforma no substitueix la feina dels òrgans fiscalitzadors, jurídics o administratius. El seu paper és ordenar dades disperses, mostrar relacions i generar indicadors que ajudin a fer millors preguntes.
                            </p>
                            <h2 className="prose-heading">Què analitza</h2>
                            <p className="prose-paragraph">
                                Iguadata permet consultar contractes, empreses adjudicatàries, persones vinculades a aquestes empreses i diferents indicadors d'anàlisi.
                            </p>
                            <p className="prose-paragraph">
                                Els principals blocs d'anàlisi són el possible fraccionament de contractes menors, la concentració d'adjudicacions en determinades empreses o sectors, els vincles mercantils entre empreses adjudicatàries i els patrons d'electoralisme o comunicació institucional en períodes sensibles.
                            </p>
                            <h2 className="prose-heading">Font de dades</h2>
                            <p className="prose-paragraph">
                                Les dades de contractació provenen del Registre Públic de Contractes de la Generalitat de Catalunya, consultat mitjançant l'API Socrata Open Data (SODA). Aquesta connexió permet treballar amb dades actualitzades de contractació pública en temps real.
                            </p>
                            <p className="prose-paragraph">
                                Les dades mercantils provenen del Butlletí Oficial del Registre Mercantil (BORME), registre oficial públic. Mitjançant un processament massiu, tècniques de mineria de dades i l'ús de programari de codi obert desenvolupat per <a href="https://github.com/BquantFinance" target="_blank" rel="noopener noreferrer" className="prose-link">Gerard Sánchez Vidal</a>, s'identifiquen els càrrecs actius de les empreses adjudicatàries.
                            </p>
                            <p className="prose-paragraph">
                                També es generen fitxers JSON propis que permeten alimentar la interfície, accelerar la consulta i mantenir còpies de suport en cas de caiguda temporal de fonts externes.
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
                                Les dades poden contenir errors d'origen, omissions, canvis posteriors o incidències derivades de la normalització automatitzada. L'aparició d'una empresa, persona o contracte en una alerta no implica cap irregularitat legal confirmada.
                            </p>
                            <p className="prose-paragraph">
                                Qualsevol conclusió periodística, administrativa o jurídica requereix contrastar les dades amb expedients originals, informes tècnics, resolucions, plecs i altres fonts documentals.
                            </p>
                            <h2 className="prose-heading">Codi obert</h2>
                            <p className="prose-paragraph">
                                El codi font del projecte és públic i està disponible a <a href="https://github.com/vicxvers/iguadata" target="_blank" rel="noopener noreferrer" className="prose-link">GitHub</a> sota llicència GNU GPL v3.0.
                            </p>
                            <h2 className="prose-heading">Contacte</h2>
                            <p className="prose-paragraph">
                                Per a suggeriments, correccions factuals, col·laboracions o consultes sobre el projecte, es pot contactar a partir de <a href="mailto:hola@iguadata.cat" className="prose-link">hola@iguadata.cat</a>.
                            </p>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'legal' && (
                    <div className="container prose-page">
                        <h1 className="page-title">Avís Legal</h1>
                        <div className="prose-wrapper">
                            <h2 className="prose-heading">1. Identificació i titularitat</h2>
                            <p className="prose-paragraph">
                                Iguadata és un projecte independent de transparència, anàlisi de dades públiques i fiscalització cívica de la contractació pública vinculada a l'Ajuntament d'Igualada i als seus organismes municipals relacionats.
                            </p>
                            <p className="prose-paragraph">
                                Iguadata no és una administració pública ni actua en nom de cap institució. La plataforma té finalitats informatives, periodístiques, educatives, de recerca i de divulgació.
                            </p>
                            <p className="prose-paragraph">
                                Responsable del projecte i del tractament: Víctor Recio Rodríguez. Contacte: <a href="mailto:hola@iguadata.cat" className="prose-link">hola@iguadata.cat</a>.
                            </p>
                            <h2 className="prose-heading">2. Origen de les dades</h2>
                            <p className="prose-paragraph">
                                Les dades de contractació provenen del Registre Públic de Contractes de la Generalitat de Catalunya, consultat mitjançant l'API Socrata Open Data (SODA), i d'altres fonts públiques oficials de contractació.
                            </p>
                            <p className="prose-paragraph">
                                Les dades mercantils provenen del Butlletí Oficial del Registre Mercantil (BORME), registre oficial de caràcter públic. Iguadata processa aquestes dades mitjançant eines automatitzades de descàrrega, extracció, normalització i encreuament de dades.
                            </p>
                            <p className="prose-paragraph">
                                La informació publicada es basa en fonts públiques i oficials. Tot i això, poden existir errors d'origen, omissions, canvis posteriors, diferències de normalització de noms o incidències derivades del processament automatitzat.
                            </p>
                            <h2 className="prose-heading">3. Actualització i traçabilitat</h2>
                            <p className="prose-paragraph">
                                La plataforma combina dades consultades en temps real amb fitxers JSON generats periòdicament a partir de fonts públiques. Part del procés d'actualització s'executa de manera automatitzada mitjançant GitHub Actions, amb controls tècnics de validació, còpies de seguretat i comprovació d'integritat dels fitxers generats.
                            </p>
                            <p className="prose-paragraph">
                                Aquest procés no altera el sentit de les dades originals, sinó que les estructura, normalitza i encreua per facilitar-ne la consulta pública i l'anàlisi.
                            </p>
                            <h2 className="prose-heading">4. Finalitat del tractament</h2>
                            <p className="prose-paragraph">
                                La finalitat d'Iguadata és facilitar l'accés, la comprensió i l'anàlisi de dades públiques sobre contractació municipal, concentració empresarial, vincles mercantils, possibles patrons de fraccionament i indicadors de risc electoral o institucional.
                            </p>
                            <p className="prose-paragraph">
                                Les visualitzacions, cercadors i alertes tenen una funció orientativa i d'interès públic. No constitueixen resolucions administratives, acusacions, proves concloents ni imputacions d'irregularitat.
                            </p>
                            <h2 className="prose-heading">5. Limitació de responsabilitat</h2>
                            <p className="prose-paragraph">
                                Els indicadors generats per Iguadata identifiquen patrons estadístics o relacions documentals que poden ser d'interès públic, però requereixen sempre interpretació contextual i, si escau, verificació addicional amb expedients, informes, plecs, resolucions administratives o altres fonts originals.
                            </p>
                            <p className="prose-paragraph">
                                L'aparició d'una empresa, persona, contracte o organisme dins d'un indicador no implica per si mateixa cap infracció legal, administrativa, ètica o penal.
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
                                El tractament es fonamenta en l'article 6.1.e) del Reglament (UE) 2016/679 (RGPD), relatiu al compliment d'una missió realitzada en interès públic, i en la normativa de transparència i accés a la informació pública, inclosa la Llei 19/2013 i la Llei 19/2014 de transparència de Catalunya.
                            </p>
                            <p className="prose-paragraph">
                                Les dades publicades es limiten a la informació estrictament necessària per a la finalitat de transparència i fiscalització pública, d'acord amb el principi de minimització de dades de l'article 5.1.c del RGPD. No es publiquen dades de la vida privada, domicilis personals, documents identificatius, dades de contacte privades ni informació aliena a la dimensió mercantil o contractual analitzada.
                            </p>
                            <h2 className="prose-heading">7. Exercici de drets i correccions</h2>
                            <p className="prose-paragraph">
                                Les persones interessades poden exercir els drets d'accés, rectificació, limitació o oposició al tractament a <a href="mailto:hola@iguadata.cat" className="prose-link">hola@iguadata.cat</a>.
                            </p>
                            <p className="prose-paragraph">
                                També es poden comunicar errors factuals, homonímies, atribucions incorrectes, canvis de denominació, dades desactualitzades o incidències derivades del processament automatitzat.
                            </p>
                            <p className="prose-paragraph">
                                Quan es detecti un error factual, Iguadata podrà corregir, contextualitzar, limitar o retirar la informació afectada. El dret de supressió pot quedar limitat quan la informació procedeixi de registres oficials públics o documentació administrativa de contractació pública, d'acord amb l'article 17.3.b) del RGPD.
                            </p>
                            <h2 className="prose-heading">8. Propietat intel·lectual i codi obert</h2>
                            <p className="prose-paragraph">
                                El disseny, la metodologia, el codi font i les transformacions de dades desenvolupades específicament són de propietat d'Iguadata.
                            </p>
                            <p className="prose-paragraph">
                                El codi font es publica sota llicència GNU GPL v3.0 a GitHub. Les dades originals pertanyen a les seves fonts públiques respectives i es reutilitzen amb finalitats de transparència, recerca i interès públic.
                            </p>
                            <h2 className="prose-heading">9. Fonts normatives principals</h2>
                            <p className="prose-paragraph">
                                El present avís legal es basa, entre altres, en el Reglament (UE) 2016/679 (RGPD), la Llei 19/2013, de transparència, accés a la informació pública i bon govern, i la Llei 19/2014, de transparència, accés a la informació pública i bon govern de Catalunya.
                            </p>
                        </div>
                    </div>
                )
            }

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
                        <div className={`footer-content${activeTab === 'sobre' || activeTab === 'legal' ? ' footer-content-prose' : ''}`}>
                            <div className="footer-main">
                                <div className="footer-brand">
                                    <a href={BASE + '/'} onClick={(e) => { e.preventDefault(); handleNavigation('home'); }} className="footer-logo-link" aria-label="Iguadata, inici">
                                        <img src={assetUrl('/assets/iguadata.svg')} alt="Iguadata" className="footer-logo" />
                                    </a>
                                    <p className="footer-tagline">El projecte de transparència d'Igualada</p>
                                    <div className="footer-social">
                                        <a href="https://www.instagram.com/iguadata/" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="Iguadata a Instagram">
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <rect x="3" y="3" width="18" height="18" rx="5" />
                                                <circle cx="12" cy="12" r="4" />
                                                <circle cx="17.5" cy="6.5" r="1" className="footer-social-fill" />
                                            </svg>
                                        </a>
                                        <a href="mailto:hola@iguadata.cat" className="footer-social-link" aria-label="Escriu a Iguadata">
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
                                        <a href={BASE + '/analisi'} onClick={(e) => { e.preventDefault(); handleNavigation('analisi'); }} className="footer-link">Anàlisi</a>
                                    </div>
                                    <div className="footer-nav-column">
                                        <a href={BASE + '/sobre'} onClick={(e) => { e.preventDefault(); handleNavigation('sobre'); }} className="footer-link">Sobre</a>
                                        <a href="mailto:hola@iguadata.cat" className="footer-link">Contacte</a>
                                        <a href="https://github.com/vicxvers/iguadata" target="_blank" rel="noopener noreferrer" className="footer-link">Codi obert</a>
                                        <a href={BASE + '/avis-legal'} onClick={(e) => { e.preventDefault(); handleNavigation('legal'); }} className="footer-link">Avís legal</a>
                                    </div>
                                </nav>
                            </div>

                            <div className="footer-copyright">© 2026 Iguadata. Tots els drets reservats.</div>
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
