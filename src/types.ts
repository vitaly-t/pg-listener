import {IMain, IDatabase, IConnected, ILostContext} from 'pg-promise';
import {RetryOptions} from './retry-async';

export interface IListenConfig {
    pgp: IMain;
    db: IDatabase<{}>;
}

export interface IListenMessage {
    channel: string;
    payload: string;
    processId: number;
}

export interface IListenResult {
    cancel: (unlisten?: boolean) => Promise<boolean>;
}

export interface IListenOptions extends RetryOptions {
    onMessage: (msg: IListenMessage) => void;
    onConnected?: (con: IConnected<{}, any>, count: number) => void;
    onDisconnected?: (err: any, ctx: ILostContext) => void;
    onFailedReconnect?: (err: any) => void;
}
