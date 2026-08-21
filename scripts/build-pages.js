const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadProjectConfig } = require('./lib/project-config');

const root = path.resolve(__dirname, '..');
const PROJECT_CONFIG = loadProjectConfig(root);
const { brand, municipality, site } = PROJECT_CONFIG;
const investigationsPath = path.join(root, 'json', 'investigacio.json');
const sitemapPath = path.join(root, 'sitemap.xml');
const assetVersion = relativePath => crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n?/g, '\n'))
    .digest('hex')
    .slice(0, 12);
const ASSET_VERSIONS = {
    bootstrap: assetVersion('assets/bootstrap.js'),
    app: assetVersion('assets/app.js'),
    styles: assetVersion('styles.css'),
};
const SPA_REDIRECT_SOURCE = `(function (location) {
    var segmentCount = location.hostname.endsWith('github.io') ? 1 : 0;
    location.replace(
        location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') +
        location.pathname.split('/').slice(0, 1 + segmentCount).join('/') + '/?/' +
        location.pathname.slice(1).split('/').slice(segmentCount).join('/').replace(/&/g, '~and~') +
        (location.search ? '&' + location.search.slice(1).replace(/&/g, '~and~') : '') +
        location.hash
    );
})(window.location);`;

const primaryPages = [
    {
        route: '',
        title: `${brand.name} | ${brand.tagline}`,
        description: `${brand.name} és la plataforma independent de periodisme de dades que analitza la contractació pública i les subvencions de l'Ajuntament d'${municipality.name}.`,
    },
    {
        route: 'contractes',
        title: `Contractes | ${brand.name}`,
        description: `Explora els contractes públics de l'Ajuntament d'${municipality.name}.`,
    },
    {
        route: 'empreses',
        title: `Empreses | ${brand.name}`,
        description: `Explora les empreses adjudicatàries dels contractes públics de l'Ajuntament d'${municipality.name}.`,
    },
    {
        route: 'persones',
        title: `Persones | ${brand.name}`,
        description: `Explora les persones vinculades als contractes públics de l'Ajuntament d'${municipality.name}.`,
    },
    {
        route: 'subvencions',
        title: `Subvencions | ${brand.name}`,
        description: `Consulta les subvencions públiques de l'Ajuntament d'${municipality.name}.`,
    },
    {
        route: 'analisi',
        title: `Anàlisi | ${brand.name}`,
        description: 'Algoritmes de detecció de casos potencials de fraccionament, concentració, electoralisme i dependència de subvencions.',
    },
    {
        route: 'investigacio',
        title: `Casos d'investigació | ${brand.name}`,
        description: `Casos d'investigació sobre la contractació pública i les subvencions de l'Ajuntament d'${municipality.name}.`,
    },
    {
        route: 'sobre',
        title: `Sobre | ${brand.name}`,
        description: 'Coneix el projecte, la metodologia i les fonts de dades.',
        robots: 'noindex, follow',
        includeInSitemap: false,
        dataNosnippet: false,
    },
];

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderPage({
    title,
    description,
    canonical,
    prefix,
    robots = 'index, follow',
    type = 'website',
    socialImage = '',
    dataNosnippet = true,
}) {
    const imageMeta = socialImage
        ? `\n    <meta property="og:image" content="${escapeHtml(socialImage)}">\n    <meta name="twitter:image" content="${escapeHtml(socialImage)}">`
        : '';
    const rootAttribute = dataNosnippet ? ' data-nosnippet' : '';

    return `<!DOCTYPE html>
<html lang="${escapeHtml(site.language)}">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://static.cloudflareinsights.com https://challenges.cloudflare.com; connect-src 'self' https://cloudflareinsights.com https://api.iguadata.cat; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="robots" content="${robots}">
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="${type}">
    <meta property="og:site_name" content="${escapeHtml(brand.name)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">${imageMeta}
    <meta name="twitter:card" content="${socialImage ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <title>${escapeHtml(title)}</title>
    <script src="${prefix}assets/bootstrap.js?v=${ASSET_VERSIONS.bootstrap}"></script>
    <link rel="icon" href="${prefix}favicon.ico" type="image/x-icon">
    <link rel="icon" href="${prefix}favicon-48x48.png" type="image/png" sizes="48x48">
    <link rel="stylesheet" href="${prefix}assets/fonts/fonts.css">
    ${site.cloudflareBeaconToken ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${escapeHtml(site.cloudflareBeaconToken)}"}'></script>` : ''}
    <link rel="stylesheet" href="${prefix}styles.css?v=${ASSET_VERSIONS.styles}">
    <script defer src="${prefix}assets/vendor/react.production.min.js"></script>
    <script defer src="${prefix}assets/vendor/react-dom.production.min.js"></script>
    <script defer src="${prefix}assets/app.js?v=${ASSET_VERSIONS.app}"></script>
</head>

<body>
    <div id="root"${rootAttribute}></div>
</body>

</html>
`;
}

function renderSpaFallback() {
    const scriptHash = crypto.createHash('sha256').update(SPA_REDIRECT_SOURCE).digest('base64');
    return `<!DOCTYPE html>
<html lang="${escapeHtml(site.language)}">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'sha256-${scriptHash}'; object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta name="robots" content="noindex, nofollow">
    <title>${escapeHtml(brand.name)}</title>
    <script>${SPA_REDIRECT_SOURCE}</script>
</head>

<body></body>

</html>
`;
}

function canonicalFor(route) {
    return `${site.url}/${route ? `${route}/` : ''}`;
}

for (const page of primaryPages) {
    const outputPath = page.route
        ? path.join(root, page.route, 'index.html')
        : path.join(root, 'index.html');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, renderPage({
        ...page,
        canonical: canonicalFor(page.route),
        prefix: page.route ? '../' : '',
    }), 'utf8');
}
fs.writeFileSync(path.join(root, '404.html'), renderSpaFallback(), 'utf8');

const investigations = JSON.parse(fs.readFileSync(investigationsPath, 'utf8'));
for (const investigation of investigations) {
    if (!investigation.slug || !investigation.title || !investigation.subtitle) {
        throw new Error('Cada investigació necessita slug, title i subtitle');
    }
    const socialPath = investigation.image
        ? investigation.image.replace(/\.webp$/, '-og.jpg')
        : '';
    const outputDir = path.join(root, 'investigacio', investigation.slug);
    fs.mkdirSync(outputDir, { recursive: true });
    if (socialPath && !fs.existsSync(path.join(root, socialPath.replace(/^\//, '')))) {
        throw new Error(`Falta la imatge social de ${investigation.slug}: ${socialPath}`);
    }

    fs.writeFileSync(path.join(outputDir, 'index.html'), renderPage({
        title: `${investigation.title} | ${brand.name}`,
        description: investigation.subtitle,
        canonical: canonicalFor(`investigacio/${investigation.slug}`),
        prefix: '../../',
        type: 'article',
        socialImage: socialPath ? `${site.url}${socialPath}` : '',
    }), 'utf8');
}

const sitemapRoutes = primaryPages
    .filter(page => page.includeInSitemap !== false)
    .map(page => canonicalFor(page.route));
const investigationRoutes = investigations
    .map(investigation => canonicalFor(`investigacio/${investigation.slug}`));
const sitemapUrls = [...sitemapRoutes, ...investigationRoutes]
    .map(url => `  <url>\n    <loc>${url}</loc>\n  </url>`)
    .join('\n');
fs.writeFileSync(
    sitemapPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`,
    'utf8'
);

console.log(`Generated ${primaryPages.length} primary pages, ${investigations.length} investigation pages, 404.html and sitemap.xml`);
