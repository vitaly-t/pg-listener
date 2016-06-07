'use strict';

////////////////////////////////////////////
// Simpler check for null/undefined;
function isNull(value) {
    return value === null || value === undefined;
}

////////////////////////////////////////////////////////
// Verifies parameter for being a non-empty text string;
function isText(txt) {
    return txt && typeof txt === 'string' && /\S/.test(txt);
}

module.exports = {
    isText: isText,
    isNull: isNull
};

Object.freeze(module.exports);
