pg-listener
-----------

[![ci](https://github.com/vitaly-t/pg-listener/actions/workflows/ci.yml/badge.svg)](https://github.com/vitaly-t/pg-listener/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/nodejs-20%20--%2024-green.svg?logo=node.js&style=flat)](https://nodejs.org)

Postgres notification listener for [pg-promise].

## Installing

```
$ npm i pg-listener
```

## Usage

This library uses [pg-promise] under the hood, as a peer dependency, which you need to install yourself.

```ts
import pgPromise from 'pg-promise';
import {PgListener, IListenEvents} from 'pg-listener';

const pgp = pgPromise();

const db = pgp({
    user: 'postgres',
    password: '########',
    database: 'postgres',
    port: 5432,
    keepAlive: true
});

const ls = new PgListener({pgp, db});

const events: IListenEvents = {
    onMessage(msg) {
        console.log(msg); // log messages from 2 channels
    },
    onConnected(con, count) {
        console.log(`*** Connected: ${count} time(s) ***`);
    },
    onDisconnected(err, ctx) {
        console.log('*** Disconnected:', err.message);
    },
    onFailedReconnect(err) {
        // Listening Terminated: cannot reconnect
        console.error('*** Reconnect Failed:', err.message);
    }
};

ls.listen(['channel_1', 'channel_2'], events)
    .then(result => {
        console.log('*** Initial Connection ***');
    })
    .catch(e => {
        console.error('Initial Connection Failed:', e.message)
    });
```

Internally, the library makes use of [retry-async] to retry broken connections. You can set `RetryOptions` via properties
[retryDefault] and [retryInitial] when creating the listener:

```ts
const ls = new PgListener({
    pgp,
    db,
    retryDefault: {
        delay: s => (s.index + 1) * 1000, // +1s delay for each retry
        retry: 5 // retry up to 5 times
    }
});
```

Above, [retryDefault] is for both initial and later connection attempts, while [retryInitial] sets/overrides it specifically
for the initial connection if you want it to be different.

[pg-promise]:https://github.com/vitaly-t/pg-promise
[retry-async]:https://github.com/vitaly-t/retry-async
[retryDefault]:https://vitaly-t.github.io/pg-listener/interfaces/IListenConfig.html#retrydefault
[retryInitial]:https://vitaly-t.github.io/pg-listener/interfaces/IListenConfig.html#retryinitial
