import {IConnected} from 'pg-promise';
import {retryAsync} from './retry-async';
import {IListenConfig, IListenMessage, IListenOptions, IListenResult} from './types';

export class PgListener {
    constructor(public cfg: IListenConfig) {
    }

    async listen(channels: string[], opt?: IListenOptions): Promise<IListenResult> {
        const handler = (m: IListenMessage) => opt?.onMessage({
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
                onLost(err, ctx) {
                    con = null;
                    ctx.client.removeListener('notification', handler);
                    opt?.onDisconnected?.(err, ctx);
                    retryAsync(reconnect, opt).catch(err => opt?.onFailedReconnect?.(err));
                }
            });
            con.client.on('notification', handler);
            await con.multi(pgp.helpers.concat(channels.map(a => ({
                query: 'LISTEN $1:name',
                values: [a]
            }))));
            opt?.onConnected?.(con, ++count);
        };
        await retryAsync(reconnect, opt);
        return {
            async cancel(unlisten = false): Promise<boolean> {
                if (con) {
                    con.client.removeListener('notification', handler);
                    if (unlisten) {
                        await con.multi(pgp.helpers.concat(channels.map(a => ({
                            query: 'UNLISTEN $1:name',
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

}
