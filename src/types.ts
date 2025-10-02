import {IMain, IDatabase, IConnected, ILostContext} from 'pg-promise';
import {RetryOptions} from './retry-async';

/**
 * Configuration interface for setting up a listener with specific
 * database connection and retry behaviors.
 */
export interface IListenConfig {
    /**
     * {@link https://vitaly-t.github.io/pg-promise/module-pg-promise.html Initialized instance} from
     * {@link https://github.com/vitaly-t/pg-promise pg-promise}.
     */
    pgp: IMain;

    /**
     * {@link https://vitaly-t.github.io/pg-promise/Database.html Database} instance from
     * {@link https://github.com/vitaly-t/pg-promise pg-promise}.
     */
    db: IDatabase<{}>;

    /**
     * Retry options for all connection attempts. When not specified,
     * internal `retryDefault` is used for re-connecting.
     *
     * Not used for initial connection if `retryInitial` is specified.
     *
     * @example
     * The example below will make the first reconnection attempt after 500ms,
     * and all the following ones after 2s each, indefinitely.
     *
     * ```ts
     * const cfg: IListenConfig = {
     *     pgp, db,
     *     retryAll: {
     *         delay: s => s.index ? s.index * 2000 : 500
     *     }
     * };
     * ```
     */
    retryAll?: RetryOptions;

    /**
     * Retry options, for the initial connection only. When not specified,
     * `retryAll` is used, and if not set either - then `retryDefault`.
     *
     * @example
     * The example below will make all initial connection attempts repeat after 500ms,
     * with up to 10 retries, and only then fail.
     *
     * ```ts
     * const cfg: IListenConfig = {
     *     pgp, db,
     *     retryInitial: {retry: 10, delay: 500}
     * };
     * ```
     */
    retryInitial?: RetryOptions;
}

/**
 * Notification message received from Postgres.
 */
export interface IListenMessage {
    /**
     * Name of the channel that sent the notification.
     */
    channel: string;

    /**
     * Length of the notification payload, in bytes.
     *
     * Note: this is different from the number of characters
     * in the payload, as the payload may contain binary data.
     */
    length: number;

    /**
     * Notification Payload: the actual data sent with the notification.
     */
    payload: string;

    /**
     * PID of the Postgres process that sent the notification.
     */
    processId: number;
}

/**
 * Result from {@link PgListener.listen} method.
 */
export interface IListenResult {

    /**
     * Adds a list of channels to listen to and executes `LISTEN` on those,
     * if currently connected.
     *
     * It will ignore channels that are already on the list.
     *
     * @param {string[]} channels - List of channels to be added.
     *
     * @returns {Promise<string[]>} A promise that resolves to a list
     *          of channels actually added (not on the list yet).
     *
     * @see {@link remove}
     */
    add: (channels: string[]) => Promise<string[]>;

    /**
     * Removes a list of channels from being listened to and executes `UNLISTEN` on those,
     * if currently connected.
     *
     * It will ignore channels that are not on the list.
     *
     * If no more channels are left after the removal, the connection is NOT closed.
     *
     * @param {string[]} channels - List of channels to be removed.
     *
     * @returns {Promise<string[]>} A promise that resolves to a list
     *          of channels actually removed (those still on the list).
     *
     * @see {@link add}
     */
    remove: (channels: string[]) => Promise<string[]>;

    /**
     * Closes the connection allocated by {@link PgListener.listen} method,
     * with optional `UNLISTEN` request for all channels.
     *
     * If successful, it removes the connection from {@link PgListener.connections}
     * list, and returns `true`.
     *
     * @param {boolean} [unlisten] - Optional flag indicating whether to
     *        also execute `UNLISTEN` for all channels.
     * @returns {Promise<boolean>} A promise that resolves to a boolean
     *          indicating whether the cancellation was successful.
     */
    cancel: (unlisten?: boolean) => Promise<boolean>;

    /**
     * Sends a notification to the list of specified channels,
     * on the connection allocated by {@link PgListener.listen} method.
     *
     * @param {string[]} channels - An array of destination channels where the notification should be sent.
     * If you pass in an empty list, the method will do nothing and just return `false`.
     * @param {string} [payload] - Optional payload data to include in the notification.
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating the success of notification.
     */
    notify: (channels: string[], payload?: string) => Promise<boolean>;

    /**
     * Checks if the connection object allocated by {@link PgListener.listen}
     * is currently in the connected state.
     */
    isConnected: boolean;

    /**
     * Checks if the connection object allocated by {@link PgListener.listen}
     * is currently in the connected state or trying to connect/reconnect,
     * i.e. if the connection is still generally alive.
     *
     * When `false`, the connection is lost permanently, and event
     * {@link IListenEvents.onFailedReconnect onFailedReconnect} has been triggered.
     */
    isLive: boolean;
}

/**
 * Optional event handlers passed into {@link PgListener.listen} method.
 */
export interface IListenEvents {

    /**
     * A callback for receiving a notification message from Postgres.
     */
    onMessage?: (msg: IListenMessage) => void;

    /**
     * A callback for when a new connection has been established.
     *
     * This is mainly for logging purposes / diagnostics.
     *
     * @param {IConnected<{}, any>} con - New `pg-promise` connection object.
     * @param {number} count - Number of times the connection has been established.
     */
    onConnected?: (con: IConnected<{}, any>, count: number) => void;

    /**
     * A callback function that is invoked when a disconnection event occurs
     * i.e. when the connection has been lost temporarily.
     *
     * This is mainly for logging purposes / diagnostics.
     *
     * @param {any} err - The error object pertaining to the disconnection issue.
     * @param {ILostContext} ctx - The context associated with the disconnection, providing additional details or state information.
     */
    onDisconnected?: (err: any, ctx: ILostContext) => void;

    /**
     * A callback function that is invoked when a reconnection attempt fails.
     *
     * Receiving this event means that the connection has been lost permanently,
     * and the library won't try to auto-reconnect again, i.e. you would need to call
     * {@link PgListener.listen} again for another connection attempt, or just exit the application.
     *
     * @param {any} err - The error object or information related to the failed reconnection attempt.
     */
    onFailedReconnect?: (err: any) => void;
}

/**
 * Connection details, as added by {@link PgListener.listen} method into {@link PgListener.connections} list.
 */
export interface IListenConnection {
    /**
     * Date/time when the connection was added to {@link PgListener.connections} list.
     */
    created: Date;

    /**
     * A list of channels that were passed into {@link PgListener.listen} method
     * to create this connection and listen to notifications on those channels.
     */
    channels: string[];

    /**
     * Return result from {@link PgListener.listen} method.
     */
    result: IListenResult;
}
