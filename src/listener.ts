import {IConnected} from 'pg-promise';
import {retryAsync, RetryOptions} from './retry-async';
import {IListenConfig, IListenMessage, IListenEvents, IListenResult} from './types';

/**
 * Default retry options, to be used when `retryMain` and `retryInitial` are not specified.
 */
const retryDefault: RetryOptions = {
    retry: 5, // up to 5 retries
    delay: s => 5 ** (s.index + 1) // Exponential delays: 5, 25, 125, 625, 3125 ms
};

/**
 * The `PgListener` class provides functionality to listen to PostgreSQL NOTIFY/LISTEN events
 * and handle them dynamically using provided configuration and event handlers.
 */
export class PgListener {

    /**
     * Constructor for initializing the configuration object.
     *
     * @param {IListenConfig} cfg - The configuration object used to initialize the instance.
     * @return {void}
     */
    constructor(public cfg: IListenConfig) {
    }

    private get sql(): { listen: string, unlisten: string, notify: string } {
        if (this.cfg.db.$config.options.capSQL) {
            return {listen: 'LISTEN', unlisten: 'UNLISTEN', notify: 'NOTIFY'};
        }
        return {listen: 'listen', unlisten: 'unlisten', notify: 'notify'};
    }

    /**
     * Subscribes to specified database channels and listens for notifications.
     * Handles automatic reconnection on lost connections.
     *
     * @param {string[]} channels - An array of channel names to listen to.
     * @param {IListenEvents} [e] - Optional event handlers for managing notifications, connection events, and errors.
     * @return {Promise<IListenResult>} A promise that resolves to an object containing a cancel method for stopping the listeners.
     */
    async listen(channels: string[], e?: IListenEvents): Promise<IListenResult> {
        const handler = (m: IListenMessage) => e?.onMessage?.({
            channel: m.channel,
            length: m.length,
            payload: m.payload,
            processId: m.processId
        });
        const {db, pgp} = this.cfg;
        const sql = this.sql;
        let count = 0;
        let con: IConnected<{}, any> | null = null;
        const reconnect = async () => {
            con = await db.connect({
                direct: true,
                onLost: (err, ctx) => {
                    con = null;
                    ctx.client.removeListener('notification', handler);
                    e?.onDisconnected?.(err, ctx);
                    retryAsync(reconnect, this.cfg.retryAll || retryDefault)
                        .catch(err => e?.onFailedReconnect?.(err));
                }
            });
            con.client.on('notification', handler);
            await con.multi(pgp.helpers.concat(channels.map(channel => ({
                query: `${sql.listen} $(channel:alias)`,
                values: {channel}
            }))));
            e?.onConnected?.(con, ++count);
        };
        await retryAsync(reconnect, this.cfg.retryInitial || this.cfg.retryAll || retryDefault);
        return {
            async cancel(unlisten = false): Promise<boolean> {
                if (con) {
                    con.client.removeListener('notification', handler);
                    if (unlisten) {
                        await con.multi(pgp.helpers.concat(channels.map(channel => ({
                            query: `${sql.unlisten} $(channel:alias)`,
                            values: {channel}
                        }))));
                    }
                    con.done();
                    con = null;
                    return true;
                }
                return false;
            },
            async notify(channels: string[], payload?: string) {
                if (con) {
                    payload ??= ''; // send empty payload for null/undefined
                    await con.multi(pgp.helpers.concat(channels.map(channel => ({
                        query: `${sql.notify} $(channel:alias), $(payload)`,
                        values: {channel, payload}
                    }))));
                    return true;
                }
                return false;
            }
        };
    }
}
