import {IConnected} from 'pg-promise';
import {retryAsync, RetryOptions} from './retry-async';
import {IListenConfig, IListenMessage, IListenEvents, IListenResult, IListenConnection} from './types';

/**
 * Default retry options, to be used when `retryAll` and `retryInit` are not specified.
 */
const retryDefault: RetryOptions = {
    retry: 5, // up to 5 retries
    delay: s => 5 ** (s.index + 1) // Exponential delays: 5, 25, 125, 625, 3125 ms
};

/**
 * Provides functionality to listen to Postgres `NOTIFY / LISTEN` events and handle them dynamically
 * using provided configuration and event handlers.
 */
export class PgListener {

    /**
     * Constructor for initializing the listener from a configuration object.
     *
     * @param {IListenConfig} cfg - Configuration object for initializing the instance.
     */
    constructor(public cfg: IListenConfig) {
    }

    /**
     * A list of all live connections, created by method {@link listen}.
     *
     * Connections that are no longer live are automatically removed from the list.
     *
     * This is mainly for the logging purpose / diagnostics.
     *
     * Beware of calling {@link IListenResult.cancel} while iterating over it, because
     * {@link IListenResult.cancel} removes the connection from this list.
     * In most cases, {@link cancelAll} is a better choice.
     *
     * @see {@link cancelAll}
     */
    readonly connections: IListenConnection[] = [];

    private get sql(): { listen: string, unlisten: string, notify: string } {
        const {capSQL} = this.cfg.db.$config.options;
        return {
            listen: capSQL ? 'LISTEN' : 'listen',
            unlisten: capSQL ? 'UNLISTEN' : 'unlisten',
            notify: capSQL ? 'NOTIFY' : 'notify'
        };
    }

    /**
     * Initiates listening to specified channels for notifications,
     * while automatically handling reconnection on lost connections.
     *
     * It allocates and fully occupies one physical connection from the pool,
     * allowing for the flexibility of choosing how to split channels across connections.
     *
     * Once connected initially, the result is automatically registered within {@link connections}.
     *
     * If you want a connection just for sending notifications, pass in an empty list of channels.
     *
     * @param {string[]} channels - An array of channel names to listen to. It can be empty
     * if you want a connection just for sending notifications.
     * @param {IListenEvents} [e] - Optional event handlers for managing notifications, connection events, and errors.
     *
     * @returns {Promise<IListenResult>} A promise that resolves to an object with post-connect API.
     *
     * @see {@link IListenResult.add}, {@link IListenResult.remove}
     */
    async listen(channels: string[], e?: IListenEvents): Promise<IListenResult> {
        const channelsCopy = [...channels];
        const handler = (m: IListenMessage) => e?.onMessage?.({
            channel: m.channel,
            length: m.length,
            payload: m.payload,
            processId: m.processId
        });
        const {db, pgp} = this.cfg;
        const sql = this.sql;
        let count = 0;
        let con: IConnected<{}, any> | null = null, live = true;
        let result: IListenResult | null = null;
        const removeResult = () => {
            const idx = this.connections.findIndex(c => c.result === result);
            if (idx >= 0) {
                this.connections.splice(idx, 1);
            }
        }
        const listenTo = async (list: string[]) => {
            await con?.multi?.(pgp.helpers.concat(list.map(channel => ({
                query: `${sql.listen} $(channel:alias)`,
                values: {channel}
            }))));
        };
        const unlistenFrom = async (list: string[]) => {
            await con?.multi?.(pgp.helpers.concat(list.map(channel => ({
                query: `${sql.unlisten} $(channel:alias)`,
                values: {channel}
            }))));
        };
        const reconnect = async () => {
            con = await db.connect({
                direct: true,
                onLost: (err, ctx) => {
                    con = null;
                    ctx.client.removeListener('notification', handler);
                    e?.onDisconnected?.(err, ctx);
                    retryAsync(reconnect, this.cfg.retryAll || retryDefault)
                        .catch(err => {
                            live = false;
                            removeResult();
                            e?.onFailedReconnect?.(err);
                        });
                }
            });
            con.client.on('notification', handler);
            if (channelsCopy.length > 0) {
                await listenTo(channelsCopy);
            }
            e?.onConnected?.(con, ++count);
        };
        await retryAsync(reconnect, this.cfg.retryInit || this.cfg.retryAll || retryDefault);
        result = {
            get isConnected(): boolean {
                return !!con;
            },
            get isLive(): boolean {
                return live;
            },
            async cancel(unlisten = false): Promise<boolean> {
                if (con) {
                    con.client.removeListener('notification', handler);
                    if (unlisten && channelsCopy.length > 0) {
                        await unlistenFrom(channelsCopy);
                    }
                    con.done();
                    con = null;
                    live = false;
                    removeResult();
                    return true;
                }
                return false;
            },
            async add(channels: string[]): Promise<string[]> {
                const list = channels.filter(c => channelsCopy.indexOf(c) < 0);
                if (list.length) {
                    await listenTo(list);
                    channelsCopy.push(...list);
                }
                return list;
            },
            async remove(channels: string[]): Promise<string[]> {
                const list = channels.filter(c => channelsCopy.indexOf(c) >= 0);
                if (list.length) {
                    await unlistenFrom(list);
                    for (const a of list) {
                        channelsCopy.splice(channelsCopy.indexOf(a), 1);
                    }
                }
                return list;
            },
            async notify(channels: string[], payload?: string) {
                if (con && channels.length > 0) {
                    payload ??= '';
                    const p = payload.length ? ',$(payload)' : '';
                    await con.multi(pgp.helpers.concat(channels.map(channel => ({
                        query: `${sql.notify} $(channel:alias)${p}`,
                        values: {channel, payload}
                    }))));
                    return true;
                }
                return false;
            }
        };
        this.connections.push({created: new Date(), channels: channelsCopy, result});
        return result;
    }

    /**
     * Calls {@link IListenResult.cancel} for each result item inside {@link connections},
     * and returns the number of successful cancellations.
     *
     * @param unlisten Parameter for each {@link IListenResult.cancel} call.
     */
    async cancelAll(unlisten = false): Promise<number> {
        const res = await Promise.all(this.connections.map(c => c.result.cancel(unlisten)));
        return res.reduce((a, b) => a + (b ? 1 : 0), 0);
    }

}
