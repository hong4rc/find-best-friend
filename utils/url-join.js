'use strict';

module.exports = (origin, path) => {
    if (!path.length) {
        return origin;
    }
    const url = new URL(origin);

    if (/^\//.test(path)) {
        return url.origin + path;
    }
    if (/^\.\//.test(path)) {
        return origin.replace(/\/$/, '') + path.replace(/^\.\//, '/');
    }
};
