const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function readOption(name, fallback) {
    const index = args.indexOf(name);
    return index === -1 ? fallback : args[index + 1];
}

const port = Number(readOption('--port', '8080'));
const host = readOption('--host', '127.0.0.1');

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('El port ha de ser un enter entre 1 i 65535.');
}

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.xml': 'application/xml; charset=utf-8',
};
const BLOCKED_ROOTS = new Set([
    '.agents',
    '.codex',
    '.dev',
    '.git',
    '.github',
    'config',
    'docs',
    'scripts',
    'src',
    'tests',
]);

function resolvePublicFile(pathname) {
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch {
        return { status: 400 };
    }

    const relativeUrlPath = path.posix.normalize(`/${decodedPath}`)
        .replace(/^\/+/, '');
    const firstSegment = relativeUrlPath.split('/')[0];
    if (firstSegment.startsWith('.') || BLOCKED_ROOTS.has(firstSegment)) {
        return { status: 404 };
    }

    const candidate = path.resolve(root, ...relativeUrlPath.split('/'));
    const relativePath = path.relative(root, candidate);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return { status: 404 };
    }

    if (fs.existsSync(candidate)) {
        const stats = fs.statSync(candidate);
        if (stats.isFile()) return { status: 200, filePath: candidate };
        if (stats.isDirectory()) {
            const indexPath = path.join(candidate, 'index.html');
            if (fs.existsSync(indexPath)) return { status: 200, filePath: indexPath };
        }
    }

    if (!path.extname(relativeUrlPath)) {
        return { status: 302, spaFallback: true };
    }
    return { status: 404 };
}

function prepareDevelopmentHtml(filePath) {
    return fs.readFileSync(filePath, 'utf8')
        .replace(/;\s*upgrade-insecure-requests/g, '');
}

const server = http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end();
        return;
    }

    const requestUrl = new URL(request.url, `http://${host}:${port}`);
    const result = resolvePublicFile(requestUrl.pathname);
    if (result.spaFallback) {
        const route = requestUrl.pathname.slice(1).replace(/&/g, '~and~');
        const query = requestUrl.search
            ? `&${requestUrl.search.slice(1).replace(/&/g, '~and~')}`
            : '';
        response.writeHead(302, {
            'Cache-Control': 'no-store',
            Location: `/?/${route}${query}`,
        });
        response.end();
        return;
    }
    if (!result.filePath) {
        response.writeHead(result.status, {
            'Cache-Control': 'no-store',
            'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end(request.method === 'HEAD' ? undefined : `${result.status}\n`);
        return;
    }

    const contentType = MIME_TYPES[path.extname(result.filePath).toLowerCase()]
        || 'application/octet-stream';
    response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': contentType,
    });
    if (request.method === 'HEAD') {
        response.end();
        return;
    }
    if (path.extname(result.filePath).toLowerCase() === '.html') {
        response.end(prepareDevelopmentHtml(result.filePath));
        return;
    }
    fs.createReadStream(result.filePath).pipe(response);
});

server.listen(port, host, () => {
    console.log(`Iguadata local: http://${host}:${port}`);
});
