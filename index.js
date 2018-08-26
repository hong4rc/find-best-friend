'use strict';

const fs = require('fs');
const urlJoin = require('url-join');
const request = require('request').defaults({jar: true});
const cheerio = require('cheerio');

const browser = require('./utils/browser');
const Student = require('./Student');
const info = require('./info');

const FIRST = 0;
const MY_INDENT = 4;
const REDIRECTION_CODE = 302;
const INPUT_QR = 'input';
const SELECT_QR = 'select';
const LOGIN_QR = '#ctl01';
const TR_QR = '#MainContent_Grid1 tr:not(:first-child)';
const NAME_HP_QR = '#MainContent_TBtenHP';

const loginForm = (res, jar, query, data) => {
    const $ = cheerio.load(res.body);
    const form = $(query);
    const input = form.find(INPUT_QR);
    const select = form.find(SELECT_QR);
    const formData = {};

    input.map((index, elem) => {
        const name = $(elem).attr('name');
        const val = $(elem).val();
        if (name && val !== 'Tất cả' && val !== 'Thoát') {
            formData[name] = val;
        }
    });
    select.map((index, elem) => {
        const name = $(elem).attr('name');
        const val = $(elem).val();
        if (name && val !== 'Tất cả') {
            formData[name] = val;
        }
    });
    for (const name in data) {
        if (data.hasOwnProperty(name)) {
            formData[name] = data[name];
        }
    }
    let href = res.request.uri.href;
    href = href.substring(FIRST, href.lastIndexOf('/'));
    href = urlJoin(href, form.attr('action'));
    return browser.post(href, jar, formData)
        .then(browser.saveCookies(jar))
        .then(res => {
            if (res.statusCode === REDIRECTION_CODE) {
                const uri = res.request.uri;
                href = `${uri.protocol}//${uri.host}${res.headers.location}`;
                return browser.get(href, jar)
                    .then(browser.saveCookies(jar));
            }
            return res;
        });
};

const checkRedirect = (res, pathname, msg) => {
    if (res.request.uri.pathname !== pathname) {
        throw new Error(`Oh, Wrong "${pathname}"`);
    }

    console.log(`"${msg}"`);
    return res;
};

const firstPage = 'http://daotao.dut.udn.vn/sv/Default.aspx';
const jar = request.jar();
const listFriend = {};

const data = {
    ctl00$TextBox1: info.id,
    ctl00$TextBox2: info.pass,
};
console.log('Sending pass and id');
browser.get(firstPage)
    .then(browser.saveCookies(jar))
    .then(res => loginForm(res, jar, LOGIN_QR, data))
    .then(res => checkRedirect(res, '/sv/S_Greeting.aspx', 'Tiep tuc'))
    .then(res => loginForm(res, jar, LOGIN_QR))
    .then(res => checkRedirect(res, '/sv/S_CamKet.aspx', 'Cam ket'))
    .then(res => loginForm(res, jar, LOGIN_QR, {ctl00$MainContent$CBcamket: 'on'}))
    .then(res => checkRedirect(res, '/sv/S_NhanThan.aspx', 'Ok, login done'))
    .then(() => browser.get('http://daotao.dut.udn.vn/sv/S_LichHoc.aspx', jar))
    .then(browser.saveCookies(jar))
    .then(res => {
        const $ = cheerio.load(res.body);

        let mPromise = Promise.resolve(res);
        $('a[id^="MainContent_Grid1_LBT1_"]').map((index, elem) => {

            // if (index > 0) {
            //     return;
            // }
            const href = $(elem).attr('href');
            const target = href.replace('javascript:__doPostBack(\'', '').replace('\',\'\')', '');
            mPromise = mPromise.then(() => loginForm(res, jar, LOGIN_QR, {__EVENTTARGET: target}))
                .then(res => checkRedirect(res, '/sv/S_DSachLop.aspx', 'Choose class'))
                .then(res => {
                    const $ = cheerio.load(res.body);
                    const name = $(NAME_HP_QR).val();
                    console.log(`${name}\n`);
                    const trList = $(TR_QR);
                    trList.map((index, elem) => {
                        const student = new Student($, elem);
                        listFriend[student.id] = listFriend[student.id] || student;
                        listFriend[student.id].class.push(name);
                    });
                })
                .catch(err => {
                    console.log(err);
                });
        });
        mPromise.then(() => {
            let arr = [];
            for (const id in listFriend) {
                if (listFriend.hasOwnProperty(id)) {
                    const student = listFriend[id];
                    arr.push(student);
                }
            }
            arr = arr.sort((a, b) => b.class.length - a.class.length);
            fs.writeFileSync('./data.json', JSON.stringify(arr, null, MY_INDENT));
        });
    })
    .catch(err => {
        console.log(err);
    });
