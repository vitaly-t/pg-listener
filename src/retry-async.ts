/**
 * Retry-status object type, for use with RetryCB.
 */
export type RetryStatus<D = unknown> = {
    /**
     * Retry index, starting from 0.
     */
    readonly index: number,

    /**
     * Retry overall duration, in milliseconds.
     */
    readonly duration: number,

    /**
     * Last error, if available;
     * it is undefined only when "retryAsync" calls "func" with index = 0.
     */
    readonly error?: Error,

    /**
     * Extra data for status handlers, if specified.
     */
    readonly data?: D
};

/**
 * Retry-status callback type.
 */
export type RetryCB<T, D = unknown> = (s: RetryStatus<D>) => T;

/**
 * Type for options passed into retryAsync function.
 */
export type RetryOptions<D = unknown> = {
    /**
     * Maximum number of retries (infinite by default),
     * or a callback to indicate the need for another retry.
     */
    readonly retry?: number | RetryCB<boolean, D>,

    /**
     * Retry delays, in milliseconds (no delay by default),
     * or a callback that returns the delays.
     */
    readonly delay?: number | RetryCB<number, D>,

    /**
     * Error notifications.
     */
    readonly error?: RetryCB<void, D>,

    /**
     * Extra data for status handlers.
     */
    readonly data?: D
};

/**
 * Retries async operation returned from "func" callback, according to "options".
 */
export function retryAsync<T, D>(func: RetryCB<Promise<T>, D>, options?: RetryOptions<D>): Promise<T> {
    const start = Date.now();
    let index = 0, e: any;
    let {retry = Number.POSITIVE_INFINITY, delay = -1, error, data} = options ?? {};
    const s = () => ({index, duration: Date.now() - start, error: e, data});
    const c = (): Promise<T> => func(s()).catch(err => {
        e = err;
        typeof error === 'function' && error(s());
        if ((typeof retry === 'function' ? (retry(s()) ? 1 : 0) : retry--) <= 0) {
            return Promise.reject(e);
        }
        const d = typeof delay === 'function' ? delay(s()) : delay;
        index++;
        return d >= 0 ? (new Promise(a => setTimeout(a, d))).then(c) : c();
    });
    return c();
}
