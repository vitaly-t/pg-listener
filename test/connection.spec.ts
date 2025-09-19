import {initDb} from './db';
import {IListenEvents, PgListener} from '../src';
import {IDatabase} from 'pg-promise';

const {pgp, db} = initDb();

const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

let onLostConnection = (err: Error, ctx: { client: { removeListener: () => void } }) => {
};
let failConnect = false;

const dbMock: IDatabase<{}> = {
    $config: {
        options: {
            capSQL: false
        }
    },
    onLost: () => {
    },
    async connect(options: { onLost: () => void }) {
        onLostConnection = options.onLost;
        if (failConnect) {
            throw new Error('Ops!');
        }
        return {
            client: {
                on: () => {
                },
                removeListener: () => {
                }
            },
            done: () => {
            }
        }
    }
} as any;

describe('connection', () => {
    it('must connect to the database', () => {
        expect(db.one('SELECT 123 as value')).resolves.toEqual({value: 123});
    });
    it('must handle lost connections', async () => {
        const ls = new PgListener({pgp, db: dbMock});
        const e: IListenEvents = {
            onConnected: (msg) => {
            },
            onDisconnected: () => {
            }
        };
        const onConnectedMock = jest.spyOn(e, 'onConnected');
        const onDisconnectedMock = jest.spyOn(e, 'onDisconnected');
        const result = await ls.listen([], e);
        await pause(100);
        onLostConnection(new Error('test'), {
            client: {
                removeListener: () => {
                }
            }
        });
        await pause(100);

        expect(onConnectedMock).toHaveBeenCalledTimes(2);
        expect(onConnectedMock).toHaveBeenNthCalledWith(1, expect.any(Object), 1);
        expect(onConnectedMock).toHaveBeenNthCalledWith(2, expect.any(Object), 2);

        expect(onDisconnectedMock).toHaveBeenCalledTimes(1);
        expect(onDisconnectedMock).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));

        await result.cancel();
    });
    it('can gracefully fail reconnecting', async () => {
        const ls = new PgListener({pgp, db: dbMock, retryAll: {retry: 0}});
        const e: IListenEvents = {
            onConnected: (msg) => {
            },
            onDisconnected: () => {
            },
            onFailedReconnect: () => {
            }
        };
        const onConnectedMock = jest.spyOn(e, 'onConnected');
        const onDisconnectedMock = jest.spyOn(e, 'onDisconnected');
        const onFailedReconnectMock = jest.spyOn(e, 'onFailedReconnect');

        const result = await ls.listen([], e);
        failConnect = true;
        await pause(100);
        onLostConnection(new Error('test'), {
            client: {
                removeListener: () => {
                }
            }
        });
        await pause(100);

        expect(onConnectedMock).toHaveBeenCalledTimes(1);
        expect(onConnectedMock).toHaveBeenNthCalledWith(1, expect.any(Object), 1);

        expect(onDisconnectedMock).toHaveBeenCalledTimes(1);
        expect(onDisconnectedMock).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));

        expect(onFailedReconnectMock).toHaveBeenCalledTimes(1);

        await result.cancel();
    });
});
