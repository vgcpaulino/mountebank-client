export interface CopyFromHeaderOrQuery {
    name: string;
    into: string;
    using?: CopyConfiguration;
}

export interface CopyFromPathOrBody {
    into: string;
    using: CopyConfiguration;
}

export interface CopyConfiguration {
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

export type ChaosImplementation = 'injection' | 'native';

/**
 * Randomly injects errors and/or latency into a response, for testing retries,
 * timeouts and circuit breakers. HTTP/HTTPS only. Every field is optional and
 * defaults to "no chaos".
 */
export interface Chaos {
    /** Probability (0 to 1) of replacing the response with an error. Defaults to 0. */
    errorRate?: number;
    /**
     * Status code returned when an error is injected. Defaults to 500. The body is emptied, unless the imposter has a
     * default response: mountebank then fills the empty body from it.
     */
    errorStatus?: number;
    /** Probability (0 to 1) of adding a random delay. Defaults to 0. */
    latencyRate?: number;
    /** Maximum delay in milliseconds; the actual delay is random up to this value. Defaults to 1000. */
    maxLatency?: number;
    /**
     * How the chaos is produced:
     * - `'injection'` (default): a generated `decorate` function. Works on any mountebank version, including the
     *   latest stable one, but needs the server to allow injection (`allowInjection` / `mb --allowInjection`).
     * - `'native'`: mountebank's own `chaos` behavior. Needs mountebank 2.9.6 or later; no injection needed.
     *
     * Both behave the same: latency is added first, then the response may be replaced by an error with an empty body.
     */
    implementation?: ChaosImplementation;
}

export interface Behavior {
    wait?: number;
    chaos?: ChaosBehavior;
    decorate?: any;
    copy?: CopyBehavior;
}
