pg-listener
-----------

[![ci](https://github.com/vitaly-t/pg-listener/actions/workflows/ci.yml/badge.svg)](https://github.com/vitaly-t/pg-listener/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/nodejs-20%20--%2024-green.svg?logo=node.js&style=flat)](https://nodejs.org)

Postgres notifications listener for [pg-promise].

## Installing

```
$ npm i pg-listener
```

## Usage

Peer dependency [pg-promise] is used underneath here, which you need to include in your project.

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
        console.log('*** Lost Connection:', err.message);
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

Internally, the library makes use of [retry-async] to retry connections. You can set `RetryOptions` via properties
[retryAll] and [retryInitial] when creating the listener:

```ts
const ls = new PgListener({
    pgp, db,
    retryAll: {
        delay: s => (s.index + 1) * 1000, // +1s delay for each retry
        retry: 5 // retry up to 5 times
    }
});
```

Above, [retryAll] is for both initial and later connection attempts, while [retryInitial] sets/overrides it
specifically for the initial connection if you want it to be different. When those options are not specified, the
library uses
internal `retryDefault` that's defined like this:

```ts
const retryDefault: RetryOptions = {
    retry: 5, // up to 5 retries
    delay: s => 5 ** (s.index + 1) // Exponential delays: 5, 25, 125, 625, 3125 ms
};
```

**TIP** ☝️

> Database-connection options `keepAlive` / `keepAliveInitialDelayMillis` can be used with listeners to prevent the
> connection from dying after not receiving any events for an extended period of time.
<br/>Check [node-postgres] driver for details.

[pg-promise]:https://github.com/vitaly-t/pg-promise

[retry-async]:https://github.com/vitaly-t/retry-async

[retryAll]:https://vitaly-t.github.io/pg-listener/interfaces/IListenConfig.html#retryall

[retryInitial]:https://vitaly-t.github.io/pg-listener/interfaces/IListenConfig.html#retryinitial

[node-postgres]:https://github.com/brianc/node-postgres
