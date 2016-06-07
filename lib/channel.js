'use strict';

var utils = require('./utils');

function Channel(db, name, cb) {

    if (!utils.isText(name)) {
        throw new TypeError("Channel name must be a non-empty text string.");
    }

    if (typeof cb !== 'function') {
        throw new TypeError("Channel notification callback must be specified.");
    }

    this.name = name;
    this.cb = cb;

    var query = "listen $1~";
    if (db.$config.options.capSQL) {
        query = query.toUpperCase();
    }

    this.query = db.$config.pgp.as.format(query, name);
}

module.exports = Channel;
