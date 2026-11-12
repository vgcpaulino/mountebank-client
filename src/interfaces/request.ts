import { ImposterProtocol } from './imposter';

/**
 * A request an imposter recorded (the imposter needs `recordRequests: true`), as mountebank stores it.
 * HTTP/HTTPS imposters fill `method`, `path`, `query`, `headers` and `body`; GraphQL imposters fill
 * `operationType`, `operationName`, `args` and `headers` (mountebank-client derives `operationType` and
 * `operationName` from mb-graphql's `{ query: 'getUser' }` / `{ mutation: 'createUser' }`).
 */
export interface RecordedRequest {
    method?: string;
    path?: string;
    /** Query-string values; a key that appears several times has an array of values. */
    query?: Record<string, string | string[]>;
    /** Header names keep the casing the client sent. */
    headers?: Record<string, string | string[]>;
    /** The raw body, always a string (or absent). */
    body?: string;
    /** `body` parsed as JSON, when it is valid JSON. Added by mountebank-client. */
    json?: unknown;
    /** Parsed `application/x-www-form-urlencoded` body. */
    form?: Record<string, string | string[]>;
    /** GraphQL only: 'query' or 'mutation'. */
    operationType?: string;
    /** GraphQL only: the operation's name, e.g. 'getUser'. */
    operationName?: string;
    /** GraphQL only: the operation's arguments. */
    args?: Record<string, unknown>;
    ip?: string;
    requestFrom?: string;
    /** When mountebank recorded the request (ISO 8601). */
    timestamp?: string;
}

/**
 * Which recorded requests to return. Every field you set must match; fields you leave out match anything.
 * Objects (`query`, `headers`, an object `body`, `args`) match when they contain the given entries, so extra
 * fields in the request are fine.
 */
export interface RequestFilter {
    /** Case-insensitive, e.g. 'POST'. */
    method?: string;
    /** The exact path, or a regular expression tested against it. */
    path?: string | RegExp;
    query?: Record<string, string | string[]>;
    /** Header names are compared case-insensitively. */
    headers?: Record<string, string | string[]>;
    /** A string matches the raw body exactly; an object matches the JSON body when it contains those fields. */
    body?: string | Record<string, unknown> | unknown[];
    /** GraphQL: the operation's name. */
    operationName?: string;
    /** GraphQL: arguments the operation must contain. */
    args?: Record<string, unknown>;
}

/** One entry of `getImposters()`. */
export interface ImposterSummary {
    port: number;
    protocol: ImposterProtocol;
    name?: string;
    /** How many requests the imposter received (recorded or not). */
    numberOfRequests: number;
}
