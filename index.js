/**
 * Created by user on 11.05.2017.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            global.TWM = factory()
}(this, (function () {
    'use strict';
    const DiffMerge = require('./src/DiffMerge');
    const HTMLConverter = require('./src/HTMLConverter');
    return {DiffMerge, HTMLConverter}
})));