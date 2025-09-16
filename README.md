pg-listener
-----------

[![ci](https://github.com/vitaly-t/pg-listener/actions/workflows/ci.yml/badge.svg)](https://github.com/vitaly-t/pg-listener/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/nodejs-20%20--%2024-green.svg?logo=node.js&style=flat)](https://nodejs.org)
[![Postgres Version](https://img.shields.io/badge/postgresql-14%20--%2017-green.svg?logo=postgresql&style=flat)](https://www.postgresql.org)

Postgres notifications listener for [pg-promise], featuring:

* Automatic reconnections, with the help of [retry-async]
* Multichannel support for `LISTEN` / `NOTIFY` on one connection
* No external dependencies

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
        // Notification has arrived;
        // msg = {channel,length,payload,processId}
        console.log(msg);
    },
    onConnected(con, count) {
        // Connection Established: listening started
        console.log(`*** Connected: ${count} time(s) ***`);
    },
    onDisconnected(err, ctx) {
        // Connection Lost: need to reconnect
        console.log('*** Disconnected:', err);
    },
    onFailedReconnect(err) {
        // Listening Terminated: cannot reconnect
        console.error('*** Reconnect Failed:', err);
    }
};

// listen to 2 channels on one connection:
ls.listen(['channel_1', 'channel_2'], events)
    .then(result => {
        // result = {cancel,notify,isLive,isConnected}
        console.log('*** Successful Initial Connection ***');
    })
    .catch(err => {
        console.error('*** Failed Initial Connection:', err);
    });
```

See: [listen], [IListenResult]

Internally, the library makes use of [retry-async] to retry connections. You can set [RetryOptions] via properties
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

## Performance

To measure the performance of notifications, I used a client that listens to a channel, then sends a notification on the
same channel, which then arrives back from the local database server.

In such a scenario the client was able to loop through about 12,000 notifications per second.

It is important to understand that this performance is entirely indicative of how fast the database can process the
notifications. And it is quite irrelevant how fast this library or even Node.js can perform.

**Test Environment:**

* Windows 11 Pro
* Postgres v16
* NodeJS v24
* pg-listener v0.5.4
* pg-promise v12.10.1

## TIPS 💡

### Keeping Live Connection

Database-connection options `keepAlive` / `keepAliveInitialDelayMillis` can be used with listeners to prevent the
connection from dying after not receiving any events for an extended period of time. This is particularly important
with such hosting environments as AWS. Check [node-postgres] driver for details.

### NOTIFY Alternative

This library allows passing an empty list of channels into the [listen] method, to create and maintain a connection
just for sending notifications. However, in real world, this is hardly ever needed, because it is only `LISTEN` that
needs a robust connection, while `NOTIFY` does not, i.e. you can send `NOTIFY` right from the database
root object, without using this library:

```ts
await db.none('NOTIFY $(channel:alias), $(payload)', {
    channel: 'my_channel_name',
    payload: 'some payload text'
});
```

That's why [notify] here is inside the result from [listen] method, as a convenience for sending notifications
through the same connection as we do the listening, and with a simpler syntax.

[pg-promise]:https://github.com/vitaly-t/pg-promise

[retry-async]:https://github.com/vitaly-t/retry-async

[RetryOptions]:https://vitaly-t.github.io/pg-listener/types/RetryOptions.html

[retryAll]:https://vitaly-t.github.io/pg-listener/interfaces/IListenConfig.html#retryall

[retryInitial]:https://vitaly-t.github.io/pg-listener/interfaces/IListenConfig.html#retryinitial

[node-postgres]:https://github.com/brianc/node-postgres

[listen]:https://vitaly-t.github.io/pg-listener/classes/PgListener.html#listen

[notify]:https://vitaly-t.github.io/pg-listener/interfaces/IListenResult.html#notify

[IListenResult]:https://vitaly-t.github.io/pg-listener/interfaces/IListenResult.html
