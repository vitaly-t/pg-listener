import {initDb} from './db';
import {IListenEvents, IListenMessage, PgListener} from '../src';

const {pgp, db} = initDb();

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
        expect(await ls.cancelAll()).toBe(1);
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

describe('add', () => {
    it('can trigger empty listener', async () => {
        const ls = new PgListener({pgp, db});
        const e: IListenEvents = {
            onMessage: (msg) => {
            }
        };
        const onMessageMock = jest.spyOn(e, 'onMessage');
        const result = await ls.listen(['channel_1'], e);
        expect(await result.add(['channel_1', 'channel_2'])).toStrictEqual(['channel_2']);
        await result.notify(['channel_2'], 'hello');
        expect(onMessageMock).toHaveBeenCalledTimes(1);
        expect(onMessageMock).toHaveBeenCalledWith({
            channel: 'channel_2',
            length: 24,
            payload: 'hello',
            processId: expect.any(Number)
        });
        expect(await result.cancel()).toBe(true);
    });
    it('can handle an empty list', async () => {
        const ls = new PgListener({pgp, db});
        const result = await ls.listen([]);
        expect(await result.add([])).toStrictEqual([]);
        expect(await result.cancel()).toBe(true);
    });
});

describe('remove', () => {
    it('stops listening', async () => {
        const ls = new PgListener({pgp, db});
        const e: IListenEvents = {
            onMessage: (msg) => {
            }
        };
        const onMessageMock = jest.spyOn(e, 'onMessage');
        const result = await ls.listen(['channel_1', 'channel_2'], e);
        await result.notify(['channel_2'], 'hello');
        expect(onMessageMock).toHaveBeenCalledTimes(1);
        expect(await result.remove(['channel_2', 'bla'])).toStrictEqual(['channel_2']);
        await result.notify(['channel_2'], 'hello');
        expect(onMessageMock).toHaveBeenCalledTimes(1); // no new calls
        expect(await result.cancel()).toBe(true);
    });
    it('can handle an empty list', async () => {
        const ls = new PgListener({pgp, db});
        const result = await ls.listen(['channel_1', 'channel_2']);
        expect(await result.remove([])).toStrictEqual([]);
        expect(await result.cancel()).toBe(true);
    });
});

describe('createIterable', () => {
    it('must stream messages', async () => {
        const ls = new PgListener({pgp, db});
        const result = await ls.listen(['channel_1']);
        setTimeout(async () => {
            await result.notify(['channel_1'], 'one');
            await result.notify(['channel_1'], 'two');
            await result.cancel();
        });
        const messages: Array<IListenMessage> = [];
        for await (const msg of result.createIterable()) {
            messages.push(msg);
        }
        expect(messages).toStrictEqual([{
            channel: 'channel_1',
            length: 22,
            payload: 'one',
            processId: expect.any(Number)
        }, {
            channel: 'channel_1',
            length: 22,
            payload: 'two',
            processId: expect.any(Number)
        }]);
    });
    it('must stream into all iterables', async () => {
        const ls = new PgListener({pgp, db});
        const result = await ls.listen(['channel_1']);
        let msg1: IListenMessage | undefined = undefined, msg2: IListenMessage | undefined = undefined;
        const i1 = result.createIterable()[Symbol.asyncIterator]();
        i1.next().then(a => {
            msg1 = a.value;
        });
        const i2 = result.createIterable()[Symbol.asyncIterator]();
        i2.next().then(a => {
            msg2 = a.value;
        });
        await result.notify(['channel_1'], 'hello');
        await result.cancel();
        expect(msg1).toStrictEqual({
            channel: 'channel_1',
            length: 24,
            payload: 'hello',
            processId: expect.any(Number)
        });
        expect(msg2).toStrictEqual({
            channel: 'channel_1',
            length: 24,
            payload: 'hello',
            processId: expect.any(Number)
        });
    });
});
