const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const investigationsPath = path.join(root, 'json', 'investigacio.json');
const sitemapPath = path.join(root, 'sitemap.xml');
const APP_ASSET_VERSION = '20260713-maintenance';
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
        title: "Iguadata | El projecte de transparència d'Igualada",
        description: "Iguadata és la plataforma independent de periodisme de dades que analitza la contractació pública de l'Ajuntament d'Igualada.",
    },
    {
        route: 'contractes',
        title: 'Contractes | Iguadata',
        description: "Explora els contractes públics de l'Ajuntament d'Igualada.",
    },
    {
        route: 'empreses',
        title: 'Empreses | Iguadata',
        description: "Explora les empreses adjudicatàries dels contractes públics de l'Ajuntament d'Igualada.",
    },
    {
        route: 'persones',
        title: 'Persones | Iguadata',
        description: "Explora les persones vinculades als contractes públics de l'Ajuntament d'Igualada.",
    },
    {
        route: 'analisi',
        title: 'Anàlisi | Iguadata',
        description: 'Algoritmes de detecció de casos potencials de fraccionament, concentració i electoralisme.',
    },
    {
        route: 'investigacio',
        title: "Casos d'investigació | Iguadata",
        description: "Casos d'investigació sobre contractació pública a l'Ajuntament d'Igualada.",
    },
    {
        route: 'sobre',
        title: 'Sobre | Iguadata',
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
<html lang="ca">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="robots" content="${robots}">
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="${type}">
    <meta property="og:site_name" content="Iguadata">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">${imageMeta}
    <meta name="twitter:card" content="${socialImage ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <title>${escapeHtml(title)}</title>
    <script src="${prefix}assets/bootstrap.js?v=${APP_ASSET_VERSION}"></script>
    <link rel="icon" href="${prefix}favicon.ico" type="image/x-icon">
    <link rel="icon" href="${prefix}favicon-48x48.png" type="image/png" sizes="48x48">
    <link rel="stylesheet" href="${prefix}assets/fonts/fonts.css">
    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"23357f28d01044b1907564bc05717389"}'></script>
    <link rel="stylesheet" href="${prefix}styles.css">
    <script defer src="${prefix}assets/vendor/react.production.min.js"></script>
    <script defer src="${prefix}assets/vendor/react-dom.production.min.js"></script>
    <script defer src="${prefix}assets/app.js?v=${APP_ASSET_VERSION}"></script>
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
<html lang="ca">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'sha256-${scriptHash}'; object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta name="robots" content="noindex, nofollow">
    <title>Iguadata</title>
    <script>${SPA_REDIRECT_SOURCE}</script>
</head>

<body></body>

</html>
`;
}

function canonicalFor(route) {
    return `https://iguadata.cat/${route ? `${route}/` : ''}`;
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
        title: `${investigation.title} | Iguadata`,
        description: investigation.subtitle,
        canonical: canonicalFor(`investigacio/${investigation.slug}`),
        prefix: '../../',
        type: 'article',
        socialImage: socialPath ? `https://iguadata.cat${socialPath}` : '',
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
