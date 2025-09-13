import {IConnected} from 'pg-promise';
import {retryAsync} from './retry-async';
import {IListenConfig, IListenMessage, IListenEvents, IListenResult} from './types';

export class PgListener {

    constructor(public cfg: IListenConfig) {
    }

    async listen(channels: string[], e?: IListenEvents): Promise<IListenResult> {
        const handler = (m: IListenMessage) => e?.onMessage?.({
            channel: m.channel,
            payload: m.payload,
            processId: m.processId
        });
        const {db, pgp} = this.cfg;
        let count = 0;
        let con: IConnected<{}, any> | null = null;
        const reconnect = async () => {
            con = await db.connect({
                direct: true,
                onLost: (err, ctx) => {
                    con = null;
                    ctx.client.removeListener('notification', handler);
                    e?.onDisconnected?.(err, ctx);
                    retryAsync(reconnect, this.cfg.retryDefault)
                        .catch(err => e?.onFailedReconnect?.(err));
                }
            });
            con.client.on('notification', handler);
            await con.multi(pgp.helpers.concat(channels.map(a => ({
                query: `${this.sql.listen} $1:name`,
                values: [a]
            }))));
            e?.onConnected?.(con, ++count);
        };
        await retryAsync(reconnect, this.cfg.retryInitial || this.cfg.retryDefault);
        return {
            cancel: async (unlisten = false): Promise<boolean> => {
                if (con) {
                    con.client.removeListener('notification', handler);
                    if (unlisten) {
                        await con.multi(pgp.helpers.concat(channels.map(a => ({
                            query: `${this.sql.unlisten} $1:name`,
                            values: [a]
                        }))));
                    }
                    con.done();
                    con = null;
                    return true;
                }
                return false;
            }
        };
    }

    private get sql(): { listen: string, unlisten: string } {
        if (this.cfg.db.$config.options.capSQL) {
            return {listen: 'LISTEN', unlisten: 'UNLISTEN'};
        }
        return {listen: 'listen', unlisten: 'unlisten'};
    }
}
