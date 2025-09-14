import {IMain, IDatabase, IConnected, ILostContext} from 'pg-promise';
import {RetryOptions} from './retry-async';

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
     * Main retry options, for all connection attempts.
     *
     * Not used for initial connection if `retryInitial` is specified.
     */
    retryMain?: RetryOptions;

    /**
     * Retry options, for the initial connection only.
     *
     * When not specified, `retryMain` is used.
     */
    retryInitial?: RetryOptions;
}

export interface IListenMessage {
    channel: string;
    payload: string;
    processId: number;
}

export interface IListenResult {
    cancel: (unlisten?: boolean) => Promise<boolean>;
}

export interface IListenEvents {
    onMessage?: (msg: IListenMessage) => void;
    onConnected?: (con: IConnected<{}, any>, count: number) => void;
    onDisconnected?: (err: any, ctx: ILostContext) => void;
    onFailedReconnect?: (err: any) => void;
}
