pg-listener
-----------

[![ci](https://github.com/vitaly-t/pg-listener/actions/workflows/ci.yml/badge.svg)](https://github.com/vitaly-t/pg-listener/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/nodejs-16%20--%2024-green.svg?logo=node.js&style=flat)](https://nodejs.org)
[![Postgres Version](https://img.shields.io/badge/postgresql-12%20--%2018-green.svg?logo=postgresql&style=flat)](https://www.postgresql.org)

Postgres notifications listener for [pg-promise] (v10 or newer), featuring:

* Automatic reconnections, with the help of [retry-async]
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
    user: 'user-name',
    database: 'db-name',
    // etc.
    keepAlive: true
});

const ls = new PgListener({pgp, db});

const events: IListenEvents = {
    onMessage(msg) {
        console.log(msg); //=> {channel,length,payload,processId}
    }
    // See also: onConnected, onDisconnected, onFailedReconnect
};

// listen to 2 channels on one connection:
ls.listen(['channel_1', 'channel_2'], events)
    .then(result => {
        // Successful Initial Connection;
        // result = {cancel,notify,add,remove,isLive,isConnected}
    })
    .catch(err => {
        // Failed Initial Connection
    });
```

Alternatively, you can process notifications via an iterable object:

```ts
const result = await ls.listen(['channel_1', 'channel_2']);

for await (const msg of result.createIterable()) {
    console.log(msg);
}
```

See also:

* API: [listen] => [IListenResult]
* More [examples]

Internally, the library makes use of [retry-async] to retry connecting. You can set [RetryOptions] via properties
[retryAll] and [retryInit] when creating the listener:

```ts
const ls = new PgListener({
    pgp, db,
    retryAll: {
        delay: s => (s.index + 1) * 1000, // +1s delay for each retry
        retry: 5 // retry up to 5 times
    }
});
```

Above, [retryAll] is for both initial and later connection attempts, while [retryInit] sets/overrides it
specifically for the initial connection if you want it to be different. When those options are not specified, the
library uses
internal `retryDefault` that's defined like this:

```ts
const retryDefault: RetryOptions = {
    retry: 5, // up to 5 retries
    delay: s => 5 ** (s.index + 1) // Exponential delays: 5, 25, 125, 625, 3125 ms
};
```

## TIPS 💡

### Keeping Live Connection

Database-connection options `keepAlive` / `keepAliveInitialDelayMillis` can be used with listeners to prevent the
connection from dying after not receiving any events for an extended period of time. This is particularly important
with such hosting environments as AWS. Check [node-postgres] driver for details.

### NOTIFY Alternative

This library allows passing an empty list of channels into the [listen] method to create and maintain a connection
just for sending notifications. However, in the real world, this is hardly ever needed, because it is only `LISTEN` that
needs a robust connection, while `NOTIFY` does not, i.e. you can send `NOTIFY` right from the database
root object, without using this library:

```ts
await db.none('NOTIFY $(channel:alias), $(payload)', {
    channel: 'my_channel_name',
    payload: 'some payload text'
});
```

That's why [notify] here is inside the result from [listen] method, as a convenience for sending notifications
through the same connection as we do the listening, but with a simpler syntax.

## Performance

Check out the [Performance Test] to see how fast PostgreSQL can loop through notifications.

### RxJs

Example of integration with [RxJs]:

```ts
import {from} from 'rxjs';

const r = await ls.listen(['channel_1', 'channel_2']);

from(r.createIterable())
    .subscribe(msg => {
        console.log(msg);
    });
```

See also the [examples].

[pg-promise]:https://github.com/vitaly-t/pg-promise

[retry-async]:https://github.com/vitaly-t/retry-async

[RetryOptions]:https://vitaly-t.github.io/pg-listener/types/RetryOptions.html

[retryAll]:https://vitaly-t.github.io/pg-listener/interfaces/IListenConfig.html#retryall

[retryInit]:https://vitaly-t.github.io/pg-listener/interfaces/IListenConfig.html#retryinit

[node-postgres]:https://github.com/brianc/node-postgres

[listen]:https://vitaly-t.github.io/pg-listener/classes/PgListener.html#listen

[notify]:https://vitaly-t.github.io/pg-listener/interfaces/IListenResult.html#notify

[IListenResult]:https://vitaly-t.github.io/pg-listener/interfaces/IListenResult.html

[examples]:https://github.com/vitaly-t/pg-listener/wiki/Examples

[RxJs]:https://github.com/ReactiveX/rxjs

[Performance Test]:https://github.com/vitaly-t/pg-listener/wiki/Performance-Test
