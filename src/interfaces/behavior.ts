export interface ICopyFromHeaderQuery {
    name: string;
    into: string;
    using?: CopyConfiguration;
}

export interface ICopyFromPathBody {
    into: string;
    using: CopyConfiguration;
}

interface CopyConfiguration {
    method: 'regex' | 'xpath' | 'jsonpath';
    selector: string;
}

interface CopyFrom {
    headers?: string;
    query?: string;
}

export interface CopyBehavior {
    from: 'path' | 'body' | CopyFrom;
    into: string;
    using: CopyConfiguration;
}

/** The `chaos` behavior as mountebank expects it (mountebank 2.9.6+). */
export interface ChaosBehavior {
    errorRate?: number;
    errorStatusCode?: number;
    latencyRate?: number;
    maxLatencyMs?: number;
}

/**
 * Randomly injects errors and/or latency into a response, for testing retries,
 * timeouts and circuit breakers. HTTP/HTTPS only. Every field is optional and
 * defaults to "no chaos".
 */
export interface Chaos {
    /** Probability (0 to 1) of replacing the response with an error. Defaults to 0. */
    errorRate?: number;
    /** Status code returned when an error is injected; the body is emptied. Defaults to 500. */
    errorStatus?: number;
    /** Probability (0 to 1) of adding a random delay. Defaults to 0. */
    latencyRate?: number;
    /** Maximum delay in milliseconds; the actual delay is random up to this value. Defaults to 1000. */
    maxLatency?: number;
}

export interface Behavior {
    wait?: number;
    chaos?: ChaosBehavior;
    decorate?: any;
    copy?: CopyBehavior;
}
