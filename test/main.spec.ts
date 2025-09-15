import {initDb} from './db';
import {IListenEvents, PgListener} from '../src';

const {pgp, db} = initDb();

describe('main', () => {
    it('can connect to the database', () => {
        expect(db.one('SELECT 123 as value')).resolves.toEqual({value: 123});
    });
    it('can notify on one channel', async () => {
        const a = new PgListener({pgp, db});
        const e: IListenEvents = {
            onMessage: (msg) => {
            }
        };
        const onMessageMock = jest.spyOn(e, 'onMessage');
        const result = await a.listen(['channel_1'], e);
        await result.notify(['channel_1']);
        expect(onMessageMock).toHaveBeenCalledTimes(1);
        expect(onMessageMock).toHaveBeenCalledWith({
            channel: 'channel_1',
            length: 19,
            payload: '',
            processId: expect.any(Number)
        });
        await result.cancel();
    });
    it('can notify on multiple channels', async () => {
        const a = new PgListener({pgp, db});
        const e: IListenEvents = {
            onMessage: (msg) => {
            }
        };
        const onMessageMock = jest.spyOn(e, 'onMessage');
        const result = await a.listen(['channel_1', 'channel_2'], e);
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
        await result.cancel();
    });
});
