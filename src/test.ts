import pgPromise from 'pg-promise';
import {PgListener} from './listener';
import {IListenEvents} from './types';

const pgp = pgPromise({
    query: (e) => {
        console.log(e.query);
    },
    capSQL: true,
});

const db = pgp({
    user: 'postgres',
    password: 'Harmony1',
    database: 'postgres',
    port: 5436,
    keepAlive: true
});

function errInfo(err: any) {
    if (err instanceof AggregateError) {
        err = err.errors[0]; // use just the first error
    }
    return err?.message || err; // use just the message, when available
}

const ls = new PgListener({
    pgp, db, retryAll: {
        retry: 5,
        delay: s => (s.index + 1) * 500,
        error: s => {
            // TODO: Why no error reported as expected?
            console.log('ERR:', errInfo(s.error));
        }
    }
});

const events: IListenEvents = {
    onMessage(msg) {
        console.log(msg); // log messages from 2 channels
    },
    onConnected(con, count) {
        console.log(`*** Connected: ${count} time(s) ***`);
    },
    onDisconnected(err, ctx) {
        console.log('*** Disconnected:', errInfo(err));
    },
    onFailedReconnect(err) {
        // Listening Terminated: cannot reconnect
        console.error('*** Reconnect Failed:', errInfo(err));
    }
};

ls.listen(['mychannel', 'mychannel_2'], events)
    .then(result => {
        console.log('*** Initial Connection ***');
    })
    .catch(e => {
        console.error('Initial Connection Failed:', errInfo(e));
    });
