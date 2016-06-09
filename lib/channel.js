'use strict';

var utils = require('./utils');

// TODO: Perhaps it is best to expose the type?

function Channel(db, name, cb) {

    if (!utils.isText(name)) {
        throw new TypeError("Channel name must be a non-empty text string.");
    }

    if (typeof cb !== 'function') {
        throw new TypeError("Channel notification callback must be specified.");
    }
    
    var q = db.$config.options.capSQL ? queries.cap : queries.small,
        fm = db.$config.pgp.as.format;

    this.name = name;
    
    this.cb = cb;

    this.query = {
        listen: fm(q.listen, name),
        unlisten: fm(q.unlisten, name)
    };
    
    this.start = function (client) {
        client.on('notification', cb);
    };

    this.end = function (client) {
        client.removeEventListener('notification', cb);
    }
}

var queries = {
    cap: {
        listen: "LISTEN $1~",
        unlisten: "UNLISTEN $1~"
    },
    small: {
        listen: "listen $1~",
        unlisten: "unlisten $1~"
    }
};

module.exports = Channel;
