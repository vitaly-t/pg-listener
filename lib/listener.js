'use strict';

var utils = require('./utils');

function Listener(db) {

    if (!db || typeof db !== 'object' || !('connect' in db)) {
        throw new TypeError("Invalid database object specified.");
    }

    if (!typeof db.$config) {
        throw new TypeError("Minimum supported version of pg-promise is 4.4.7");
    }

    var channels = {};

    this.add = function (name, cb) {
        if (name in channels) {
            throw new Error("Channel already registered.");
        }
        var c = new Channel(name, cb);
        channels[name] = c;
    };

    this.remove = function (name) {
        if (!utils.isText(name)) {
            throw new TypeError("Channel name must be a non-empty text string.");
        }
        if (name in channels) {
            delete channels[name];
            return true;
        }
        return false;
    };

    this.clear = function () {
        var total = Object.keys(channels).length;
        channels = {};
        return total;
    };

    function start() {
        db.connect({direct: true})
            .then(function (obj) {

            })
    }
}

module.exports = Listener;
