(function (location) {
    var base = location.hostname.endsWith('github.io') ? '/iguadata-dev' : '';
    window.__IGUADATA_BASE__ = base;
    window.__IGUADATA_ASSET__ = function (path) {
        return base + path;
    };

    if (location.search[1] === '/') {
        var baseElement = document.createElement('base');
        baseElement.href = location.origin + base + '/';
        document.head.appendChild(baseElement);

        var decoded = location.search.slice(1).split('&').map(function (part) {
            return part.replace(/~and~/g, '&');
        }).join('?');
        window.history.replaceState(
            null,
            null,
            location.pathname.slice(0, -1) + decoded + location.hash
        );
    }
})(window.location);
