import {initDb} from './db';

const {db} = initDb();

describe('main', () => {
    it('can connect to the database', () => {
        expect(db.one('SELECT 123 as value')).resolves.toEqual({value: 123});
    });

    /*
    it('listen can connect', async () => {
        const a = new PgListener(cfgMock);
        const e: IListenEvents = {
            onConnected: () => {
            }
        };
        const res = await a.listen(['test'], e);
        await res.notify(['test']);
        expect(jest.fn(e.onConnected)).toHaveBeenCalledTimes(1);
    });*/
});
