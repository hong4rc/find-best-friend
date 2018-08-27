'use strict';

const LAST_SLASH_REGEX = /\/[^/]*?$/;
const ORIGIN_PATH_REGEX = /^\//;
const CURRENT_PATH_REGEX = /^\.\//;
const PARENT_PATH_REGEX = /^\.\.\//;

const join = (origin, path) => {
    if (!path.length) {
        return origin;
    }

    if (ORIGIN_PATH_REGEX.test(path)) {
        const url = new URL(origin);
        return url.origin + path;
    }
    if (CURRENT_PATH_REGEX.test(path)) {
        origin = origin.replace(LAST_SLASH_REGEX, '/');
        return join(origin, path.replace(CURRENT_PATH_REGEX, ''));
    }
    if (PARENT_PATH_REGEX.test(path)) {
        origin = origin.replace(LAST_SLASH_REGEX, '').replace(LAST_SLASH_REGEX, '/');
        return join(origin, path.replace(PARENT_PATH_REGEX, ''));
    }
    return origin + path;
};

module.exports = join;
