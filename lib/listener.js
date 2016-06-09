'use strict';

var utils = require('./utils');

// options:
// ''

function Listener(db, options) {

    if (!db || typeof db !== 'object' || !('connect' in db)) {
        throw new TypeError("Invalid database object specified.");
    }

    if (!typeof db.$config) {
        throw new TypeError("Minimum supported version of pg-promise is 4.4.7");
    }

    var cn, channels = {};

    this.exists = function (name) {
        // checks if the channel is registered;
    };

    this.change = function (name, cb) {
        // updates the callback in the registered channel;
        // throws error if it doesn't exist;
    };

    this.add = function (name, cb) {
        // options = a) no error, if exists b) need to update the `cb`

        if (name in channels) {
            throw new Error("Channel already registered.");
        }
        var c = new Channel(name, cb);
        channels[name] = c;

        if (cn) {
            c.start(cn.client);
            cn.none(c.queries.listen);
        }
    };

    this.remove = function (name) {
        if (!utils.isText(name)) {
            throw new TypeError("Channel name must be a non-empty text string.");
        }
        if (name in channels) {
            if (cn) {
                var c = channels[name];
                cn.none(c.queries.unlisten);
                c.end();
            }
            delete channels[name];
            return true;
        }
        return false;
    };

    this.clear = function () {
        var total = Object.keys(channels).length;
        for (var name in channels) {
            var c = channels[name];
            c.end();
            if (cn) {
                cn.none(c.query.unlisten);
            }
        }
        channels = {};
        return total;
    };

    function start() {
        return db.connect({direct: true})
            .then(function (obj) {
                cn = obj;
                return cn.task(function (t) {
                    var queries = Object.keys(channels).map(function (c) {
                        c.start(cn.client);
                        return t.none(c.query.listen);
                    });
                    return t.batch(queries);
                });
            })
            .catch(function (error) {

            });
    }

    function end() {

    }
}

module.exports = Listener;
