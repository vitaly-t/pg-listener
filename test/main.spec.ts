import {initDb} from './db';
import {IListenEvents, PgListener} from '../src';

const {pgp, db} = initDb();

describe('connectivity', () => {
    it('must connect to the database', () => {
        expect(db.one('SELECT 123 as value')).resolves.toEqual({value: 123});
    });
});

describe('listen', () => {
    it('can handle empty list of channels', async () => {
        const ls = new PgListener({pgp, db});
        const e: IListenEvents = {
            onConnected: (msg) => {
            }
        };
        const onConnectedMock = jest.spyOn(e, 'onConnected');
        const result = await ls.listen([], e);
        expect(onConnectedMock).toHaveBeenCalledTimes(1);
        expect(onConnectedMock).toHaveBeenCalledWith(expect.any(Object), 1);
        expect(result.isConnected).toBe(true);
        expect(result.isLive).toBe(true);
        expect(result.cancel()).resolves.toBe(true);
        expect(result.cancel()).resolves.toBe(false);
    });

    it('can notify on one channel', async () => {
        const ls = new PgListener({pgp, db});
        const e: IListenEvents = {
            onMessage: (msg) => {
            }
        };
        const onMessageMock = jest.spyOn(e, 'onMessage');
        const result = await ls.listen(['channel_1'], e);
        await result.notify(['channel_1']);
        expect(onMessageMock).toHaveBeenCalledTimes(1);
        expect(onMessageMock).toHaveBeenCalledWith({
            channel: 'channel_1',
            length: 19,
            payload: '',
            processId: expect.any(Number)
        });
        expect(ls.cancelAll()).resolves.toBe(1);
    });
    it('can notify on multiple channels', async () => {
        const ls = new PgListener({pgp, db});
        const e: IListenEvents = {
            onMessage: (msg) => {
            }
        };
        const onMessageMock = jest.spyOn(e, 'onMessage');
        const result = await ls.listen(['channel_1', 'channel_2'], e);
        await result.notify(['channel_1', 'channel_2'], 'hello');
        expect(onMessageMock).toHaveBeenCalledTimes(2);
        expect(onMessageMock).toHaveBeenNthCalledWith(1, {
            channel: 'channel_1',
            length: 24,
            payload: 'hello',
            processId: expect.any(Number)
        });
        expect(onMessageMock).toHaveBeenNthCalledWith(2, {
            channel: 'channel_2',
            length: 24,
            payload: 'hello',
            processId: expect.any(Number)
        });
        expect(ls.cancelAll(true)).resolves.toBe(1);
    });

    it('can handle hacked list of connections', async () => {
        // NOTE: This hacking is just for extra coverage!
        const ls = new PgListener({pgp, db});
        const result = await ls.listen([]);
        expect(result.isConnected).toBe(true);
        ls.connections.length = 0;
        expect(result.cancel()).resolves.toBe(true);
        ls.connections.push({created: new Date(), channels: [], result});
        expect(ls.cancelAll()).resolves.toBe(0);
    });
});

describe('notify', () => {
    it('must handle no connection', async () => {
        const ls = new PgListener({pgp, db});
        const result = await ls.listen([]);
        expect(result.isConnected).toBe(true);
        expect(result.isLive).toBe(true);
        expect(result.cancel()).resolves.toBe(true);
        expect(result.notify(['channel_1'])).resolves.toBe(false);
    });
    it('must handle empty channel list', async () => {
        const ls = new PgListener({pgp, db});
        const result = await ls.listen([]);
        expect(result.isConnected).toBe(true);
        expect(result.isLive).toBe(true);
        expect(result.notify([])).resolves.toBe(false);
        expect(result.cancel()).resolves.toBe(true);
    });
});
