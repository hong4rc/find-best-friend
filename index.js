'use strict';

const fs = require('fs');
const urlJoin = require('./utils/url-join');
const request = require('request').defaults({jar: true});
const cheerio = require('cheerio');

const browser = require('./utils/browser');
const log = require('./utils/log');
const Student = require('./Student');
const info = require('./info');

const FIRST = 0;
const MY_INDENT = 4;
const REDIRECTION_CODE = 302;
const INPUT_QR = 'input';
const DEFAULT_METHOD = 'get';
const SELECT_QR = 'select';
const LOGIN_QR = '#ctl01';
const TR_QR = '#MainContent_Grid1 tr:not(:first-child)';
const NAME_HP_QR = '#MainContent_TBtenHP';

const submitForm = (res, jar, query, data) => {
    const $ = cheerio.load(res.body);
    const btn = $(query);
    const form = btn.closest(LOGIN_QR) || btn;
    const input = form.find(INPUT_QR).not('[type="submit"]');
    const select = form.find(SELECT_QR);
    const formData = {};

    const pushElem = elem => {
        const name = $(elem).attr('name');
        const val = $(elem).val();
        if (name) {
            formData[name] = val;
        }
    };
    input.map((index, elem) => {
        pushElem(elem);
    });
    select.map((index, elem) => {
        pushElem(elem);
    });
    pushElem(btn);
    for (const name in data) {
        if (data.hasOwnProperty(name)) {
            formData[name] = data[name];
        }
    }
    let href = res.request.uri.href;
    href = href.substring(FIRST, href.lastIndexOf('/'));
    href = urlJoin(href, form.attr('action'));
    const method = form.attr('method') || DEFAULT_METHOD;
    return browser[method](href, jar, formData)
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

    log.newLine();
    log.info(`"${msg}"`);
    return res;
};

const formRedirect = (btn, data, pathname, msg) => res => submitForm(res, jar, btn, data)
    .then(res => checkRedirect(res, pathname, msg));

const firstPage = 'http://daotao.dut.udn.vn/sv/Default.aspx';
const jar = request.jar();
const listFriend = {};

const data = {
    ctl00$TextBox1: info.id,
    ctl00$TextBox2: info.pass,
};
const dataCamKet = {ctl00$MainContent$CBcamket: 'on'};
const dataChangePass = {
    ctl00$MainContent$TBmatkhau_C: info.pass,
    ctl00$MainContent$TBmatkhau_M: info.pass,
    ctl00$MainContent$TBmatkhau_MX: info.pass,
};
log.info('Sending pass and id');
browser.get(firstPage)
    .then(browser.saveCookies(jar))
    .then(formRedirect('#BT_DNhap', data, '/sv/S_Greeting.aspx', 'Tiep tuc'))
    .then(formRedirect('#MainContent_Button1', null, '/sv/S_CamKet.aspx', 'Cam ket'))
    .then(formRedirect('#MainContent_BTcamket', dataCamKet, '/sv/S_NhanThan.aspx', 'Ok, login done'))
    .then(formRedirect('#MainContent_BT_LuuMK', dataChangePass, '/sv/S_NhanThan.aspx', 'Change Password :)'))
    .then(() => browser.get('http://daotao.dut.udn.vn/sv/S_LichHoc.aspx', jar))
    .then(browser.saveCookies(jar))
    .then(res => {
        const $ = cheerio.load(res.body);

        let mPromise = Promise.resolve(res);
        $('a[id^="MainContent_Grid1_LBT1_"]').map((index, elem) => {

            const href = $(elem).attr('href');
            const target = href.replace('javascript:__doPostBack(\'', '').replace('\',\'\')', '');
            mPromise = mPromise.then(() => submitForm(res, jar, LOGIN_QR, {__EVENTTARGET: target}))
                .then(res => checkRedirect(res, '/sv/S_DSachLop.aspx', 'Choose class'))
                .then(res => {
                    const $ = cheerio.load(res.body);
                    const name = $(NAME_HP_QR).val();
                    log.info(name);
                    const trList = $(TR_QR);
                    trList.map((index, elem) => {
                        const student = new Student($, elem);
                        listFriend[student.id] = listFriend[student.id] || student;
                        listFriend[student.id].class.push(name);
                    });
                })
                .catch(err => {
                    log.error(err);
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
        log.error(err);
    });
