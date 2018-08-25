'use strict';
module.exports = class Student {
    constructor($, elem) {
        this.id = '';
        this.name = '';
        this.phone = '';
        this.cl = '';
        this.class = [];
        $(elem).children('td').map((index, el) => {
            switch (index) {
                case 0:
                    break;
                case 1:
                    this.name = $(el).text();
                    break;
                case 2:
                    this.id = $(el).text();
                    break;
                case 3:
                    this.phone = $(el).text();
                    break;
                case 4:
                    this.cl = $(el).text();
                    break;
                default:
            }
        });
    }
};