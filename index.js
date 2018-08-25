'use strict';

const fs = require('fs');
const urlJoin = require('url-join');
const request = require('request').defaults({jar: true});
const cheerio = require('cheerio');

const browser = require('./utils/browser');
const Student = require('./Student');

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
    href = href.substring(0, href.lastIndexOf('/'));
    console.log(href, form.attr('action'));
    href = urlJoin(href, form.attr('action'));
    return browser.post(href, jar, formData)
        .then(browser.saveCookies(jar));

};


const firstPage = 'http://daotao.dut.udn.vn/sv/Default.aspx';
const jar = request.jar();
let listFriend = {};

const info = {
    ctl00$TextBox1: 'your_id',
    ctl00$TextBox2: 'your_pass',
};
console.log('Sending pass and id');
browser.get(firstPage)
    .then(browser.saveCookies(jar))
    .then(res => loginForm(res, jar, LOGIN_QR, info))
    .then(res => {
        if (res.statusCode !== REDIRECTION_CODE || res.headers.location !== '/sv/S_Greeting.aspx') {
            throw new Error('Oh, Wrong login');
        }
        console.log('Click "Tiep tuc"');
        return browser.get('http://daotao.dut.udn.vn/sv/S_Greeting.aspx', jar)
            .then(browser.saveCookies(jar));
    })
    .then(res => loginForm(res, jar, LOGIN_QR))
    .then(res => {
        if (res.statusCode !== REDIRECTION_CODE || res.headers.location !== '/sv/S_CamKet.aspx') {
            throw new Error('Oh, Wrong "Tiep tuc"');
        }

        console.log('Click "Cam ket"');
        return browser.get('http://daotao.dut.udn.vn/sv/S_CamKet.aspx', jar)
            .then(browser.saveCookies(jar));
    })
    .then(res => loginForm(res, jar, LOGIN_QR, {ctl00$MainContent$CBcamket: 'on'}))
    .then(res => {
        if (res.statusCode !== REDIRECTION_CODE || res.headers.location !== '/sv/S_NhanThan.aspx') {
            throw new Error('Oh, Wrong "Cam ket"');
        }

        console.log('Ok, login done');
        return browser.get('http://daotao.dut.udn.vn/sv/S_LichHoc.aspx', jar)
            .then(browser.saveCookies(jar));
    })
    .then(res => {
        const $ = cheerio.load(res.body);

        let mPromise = Promise.resolve(res);
        $('a[id^="MainContent_Grid1_LBT1_"]').map((index, elem) => {
            // if (index > 0) {
            //     return;
            // }
            const href = $(elem).attr('href');
            const target = href.replace('javascript:__doPostBack(\'', '').replace('\',\'\')', '');
            console.log(target);
            mPromise = mPromise.then(mRes => loginForm(res, jar, LOGIN_QR, {__EVENTTARGET: target}))
                .then(res => {
                    if (res.statusCode !== REDIRECTION_CODE || res.headers.location !== '/sv/S_DSachLop.aspx') {
                        throw new Error('Oh, Choose class fail');
                    }
                    console.log('Getting student');
                    return browser.get('http://daotao.dut.udn.vn/sv/S_DSachLop.aspx', jar)
                        .then(browser.saveCookies(jar));
                })
                .then(res => {
                    let $ = cheerio.load(res.body);
                    let name = $(NAME_HP_QR).val();
                    let trList = $(TR_QR);
                    trList.map((index, elem) => {
                        let student = new Student($, elem);
                        listFriend[student.id] = listFriend[student.id] || student;
                        listFriend[student.id].class.push(name);
                    });
                })
                .catch(err => {
                    console.log(err);
                });
        });
        mPromise.then(res => {
            let arr = [];
            for (let id in listFriend) {
                if (listFriend.hasOwnProperty(id)) {
                    let student = listFriend[id];
                    arr.push(student);
                }
            }
            arr = arr.sort((a, b) => {
                return a.class.length - b.class.length;
            });
            fs.writeFileSync('./data.json', JSON.stringify(arr, null, 2));
        })
    })
    .catch(err => {
        console.log(err);
    });
