import { HttpMethod, ResponseRecord } from './types';

/** The request mountebank passes to a `decorate` function. */
export interface DecorateRequest {
    requestFrom: string;
    method: HttpMethod;
    /** Without the query string. */
    path: string;
    /** Query-string values are strings. */
    query: Record<string, string>;
    headers: Record<string, string>;
    /** Always a string (or empty): `JSON.parse` it yourself. */
    body: string;
    ip: string;
}

/** The response a `decorate` function changes, with mountebank's own field names (`statusCode`, not `status`). */
export interface DecorateResponse {
    statusCode?: number;
    headers?: ResponseRecord;
    /**
     * Whatever the stub returns: an object, a string, or what an earlier `decorate` put there. `any`, so a
     * `decorate` function can read and change it without casting.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see the comment above
    body?: any;
    _mode?: 'text';
    _proxyResponseTime?: number;
}

/** Writes to mountebank's log, which `client.getLogs()` reads. */
export interface DecorateLogger {
    debug: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
}

/**
 * What a `decorate` function receives. `State` types `config.state`, the object kept between requests (one per
 * imposter, shared by its stubs). Give it to type-check your state:
 *
 * ```ts
 * decorate: (config: Config<{ count?: number }>) => {
 *     config.state.count = (config.state.count ?? 0) + 1;
 * }
 * ```
 *
 * Without it, `config.state` accepts any field.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped state stays usable without a type argument
export interface Config<State extends object = Record<string, any>> {
    logger: DecorateLogger;
    request: DecorateRequest;
    response: DecorateResponse;
    state: State;
}
