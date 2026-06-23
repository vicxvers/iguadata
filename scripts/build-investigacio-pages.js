const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'json', 'investigacio.json');
const sitemapPath = path.join(root, 'sitemap.xml');
const cases = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderPage(caso) {
    const title = escapeHtml(caso.title);
    const description = escapeHtml(caso.subtitle);
    const canonical = `https://iguadata.cat/investigacio/${encodeURIComponent(caso.slug)}/`;
    const image = caso.image ? `https://iguadata.cat${caso.image}` : '';
    const imageMeta = image
        ? `\n    <meta property="og:image" content="${escapeHtml(image)}">\n    <meta name="twitter:image" content="${escapeHtml(image)}">`
        : '';

    return `<!DOCTYPE html>
<html lang="ca">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="robots" content="index, follow">
    <meta name="description" content="${description}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Iguadata">
    <meta property="og:title" content="${title} | Iguadata">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonical}">${imageMeta}
    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${title} | Iguadata">
    <meta name="twitter:description" content="${description}">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <title>${title} | Iguadata</title>
    <script>
        window.__IGUADATA_BASE__ = window.location.hostname.endsWith('github.io') ? '/iguadata-dev' : '';
        window.__IGUADATA_ASSET__ = function (path) { return window.__IGUADATA_BASE__ + path; };
    </script>
    <link rel="icon" href="../../favicon.ico" type="image/x-icon">
    <link rel="icon" href="../../favicon-48x48.png" type="image/png" sizes="48x48">
    <link rel="stylesheet" href="../../assets/fonts/fonts.css">
    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"23357f28d01044b1907564bc05717389"}'></script>
    <link rel="stylesheet" href="../../styles.css">
    <script defer src="../../assets/vendor/react.production.min.js"></script>
    <script defer src="../../assets/vendor/react-dom.production.min.js"></script>
    <script defer src="../../assets/app.js?v=20260623-investigacio-content"></script>
</head>

<body>
    <div id="root"></div>
</body>

</html>
`;
}

for (const caso of cases) {
    if (!caso.slug || !caso.title || !caso.subtitle) {
        throw new Error('Cada investigació necessita slug, title i subtitle');
    }
    const outputDir = path.join(root, 'investigacio', caso.slug);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'index.html'), renderPage(caso), 'utf8');
}

let sitemap = fs.readFileSync(sitemapPath, 'utf8');
sitemap = sitemap.replace(/\s*<url>\s*<loc>https:\/\/iguadata\.cat\/investigacio\/[^<]+\/<\/loc>\s*<\/url>/g, '');
const detailUrls = cases
    .map(caso => `  <url>\n    <loc>https://iguadata.cat/investigacio/${caso.slug}/</loc>\n  </url>`)
    .join('\n');
sitemap = sitemap.replace('</urlset>', `${detailUrls}\n</urlset>`);
fs.writeFileSync(sitemapPath, sitemap, 'utf8');

console.log(`Generated ${cases.length} investigation pages and updated sitemap.xml`);
