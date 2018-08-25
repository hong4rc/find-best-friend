'use strict';

const NAME_INDEX = 1;
const ID_INDEX = 2;
const PHONE_INDEX = 3;
const CL_INDEX = 4;

module.exports = class Student {
    constructor($, elem) {
        this.id = '';
        this.name = '';
        this.phone = '';
        this.cl = '';
        this.class = [];
        $(elem).children('td').map((index, el) => {
            switch (index) {
                case NAME_INDEX:
                    this.name = $(el).text();
                    break;
                case ID_INDEX:
                    this.id = $(el).text();
                    break;
                case PHONE_INDEX:
                    this.phone = $(el).text();
                    break;
                case CL_INDEX:
                    this.cl = $(el).text();
                    break;
                default:
            }
        });
    }
};
