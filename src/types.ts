import {IMain, IDatabase, IConnected, ILostContext} from 'pg-promise';
import {RetryOptions} from './retry-async';

/**
 * Configuration interface for setting up a listener with specific
 * database connection and retry behaviors.
 */
export interface IListenConfig {
    /**
     * pg-promise initialized instance.
     */
    pgp: IMain;

    /**
     * pg-promise database instance.
     */
    db: IDatabase<{}>;

    /**
     * Retry options for all connection attempts. When not specified,
     * internal `retryDefault` is used for re-connecting.
     *
     * Not used for initial connection if `retryInitial` is specified.
     */
    retryAll?: RetryOptions;

    /**
     * Retry options, for the initial connection only. When not specified,
     * `retryAll` is used, and if not set either - then `retryDefault`.
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
 * Result of the {@link listen} operation.
 */
export interface IListenResult {

    /**
     * Closes the connection, with optional `UNLISTEN` for all channels,
     * and returns `true` if successful.
     *
     * @param {boolean} [unlisten] - Optional flag indicating whether to
     *        also execute `UNLISTEN` for all channels.
     * @returns {Promise<boolean>} A promise that resolves to a boolean
     *          indicating whether the cancellation was successful.
     */
    cancel: (unlisten?: boolean) => Promise<boolean>;

    /**
     * Sends a notification to the specified channels.
     *
     * @param {string[]} channels - An array of channel identifiers where the notification should be sent.
     * @param {any} [payload] - Optional payload data to include in the notification.
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating the success of the notification operation.
     */
    notify: (channels: string[], payload?: any) => Promise<boolean>;
}

/**
 * Event handlers for the {@link listen} operation.
 */
export interface IListenEvents {

    /**
     * Notification message received from Postgres.
     */
    onMessage?: (msg: IListenMessage) => void;

    /**
     * Connection established.
     * @param con
     * @param count
     */
    onConnected?: (con: IConnected<{}, any>, count: number) => void;

    /**
     * A callback function that is invoked when a disconnection event occurs.
     *
     * @param {any} err - The error object or information related to the disconnection.
     * @param {ILostContext} ctx - The context associated with the disconnection, providing additional details or state information.
     */
    onDisconnected?: (err: any, ctx: ILostContext) => void;

    /**
     * A callback function that is invoked when a reconnection attempt fails.
     *
     * Receiving this event means that the connection has been lost permanently,
     * and the library won't try to reconnect again.
     *
     * @param {any} err - The error object or information related to the failed reconnection attempt.
     */
    onFailedReconnect?: (err: any) => void;
}
