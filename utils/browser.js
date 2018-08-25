'use strict';
const request = require('request').defaults({jar: true});
const FAKE_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/600.3.18 (KHTML, like Gecko)'
    + ' Chrome/63.0.3239.84 Version/8.0.3 Safari/600.3.18';
const getHeaders = (url, jar) => {
    url = new URL(url);
    return {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: url.origin,
        Host: url.host,
        Origin: url.origin,
        'User-Agent': FAKE_USER_AGENT,
        Connection: 'keep-alive',
    };
};
const method = method => (url, jar, form, qs) => {
    const option = {
        headers: getHeaders(url, jar),
        timeout: 60000,
        url: url,
        method: method,
        jar: jar,
        gzip: true
    };
    if (method.toUpperCase() === 'GET') {
        option.qs = form;
    } else {
        option.form = form;
    }
    if (qs) {
        option.qs = qs;
    }

    return new Promise(resolve => {
        request(option, (error, res) => {

            // fs.writeFileSync('index.html', res.body);
            resolve(res);
        });
    });
};
const get = method('GET');
const post = method('POST');

const saveCookies = jar => res => {
    const cookies = res.headers['set-cookie'] || [];
    cookies.forEach(cookie => {
        console.log('cookie', cookie);
        jar.setCookie(cookie, 'http://daotao.dut.udn.vn');
    });
    return res;
};

module.exports = {
    get,
    post,
    saveCookies,
};