(function (location) {
    var segmentCount = location.hostname.endsWith('github.io') ? 1 : 0;
    location.replace(
        location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') +
        location.pathname.split('/').slice(0, 1 + segmentCount).join('/') + '/?/' +
        location.pathname.slice(1).split('/').slice(segmentCount).join('/').replace(/&/g, '~and~') +
        (location.search ? '&' + location.search.slice(1).replace(/&/g, '~and~') : '') +
        location.hash
    );
})(window.location);
