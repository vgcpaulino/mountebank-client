import { Imposter, ImposterSummary, LogLevel, RecordedRequest, RequestFilter, Stub } from '../interfaces';
import { matchesFilter, normalizeRequest } from './requestFilter';
import { checkError, MountebankError } from './errorHelper';
import { MountebankLogger, request } from './http';

export type { MountebankLogger } from './http';

export { MountebankError } from './errorHelper';
export type { MountebankErrorDetail, MountebankOperation } from './errorHelper';

/** The URL used when `createClient` gets none: `MOUNTEBANK_URL`, or `http://localhost:2525`. */
export function defaultMountebankUrl() {
    return process.env.MOUNTEBANK_URL || 'http://localhost:2525';
}

export interface ClientOptions {
    /** The mountebank server, e.g. `'http://localhost:2525'`. Defaults to `MOUNTEBANK_URL`, then `http://localhost:2525`. */
    url?: string;
    /**
     * Gets a `debug` message for every call to mountebank: method, URL, status and time taken, e.g.
     * `mountebank-client: POST http://localhost:2525/imposters → 201 (12 ms)`. Pass `console` to see them. Off by
     * default.
     */
    logger?: MountebankLogger;
}

/**
 * An imposter as mountebank returns it: its definition, plus how many requests it received, what it recorded (with
 * `recordRequests: true`), and its stubs with mountebank's links.
 */
export interface ImposterDetails extends Imposter {
    numberOfRequests?: number;
    recordRequests?: boolean;
    requests?: Record<string, unknown>[];
}

export interface MountebankLog {
    level: LogLevel;
    message: string;
    timestamp: string;
}

/**
 * Talks to one mountebank server. Create it with `createClient({ url })`.
 *
 * ```ts
 * const mb = createClient({ url: 'http://localhost:2525' });
 * const users = await mb.createImposter(new ImposterBuilder({ port: 8080, protocol: 'http' }).addStub(stub));
 * await users.addStub(anotherStub);
 * ```
 */
export class MountebankClient {
    /** The server's URL, without a trailing slash. */
    readonly url: string;
    private readonly logger?: MountebankLogger;

    constructor({ url = defaultMountebankUrl(), logger }: ClientOptions = {}) {
        this.url = url.replace(/\/+$/, '');
        this.logger = logger;
    }

    private send(...[operation, method, url, body]: Parameters<typeof request>) {
        return request(operation, method, url, body, this.logger);
    }

    /**
     * Creates an imposter from an `ImposterBuilder` (or a plain imposter definition) and returns a handle to it.
     * Throws a `MountebankError` if the port is already taken: delete the old imposter first, or use `resetImposters`.
     */
    async createImposter(imposter: Imposter): Promise<ImposterClient> {
        const { port, protocol, name, schema, allowCORS, recordRequests, defaultResponse, stubs = [] } = imposter;
        const response = await this.send('ADD_IMPOSTER', 'POST', `${this.url}/imposters`, {
            port,
            protocol,
            name,
            schema,
            allowCORS,
            recordRequests,
            defaultResponse,
            stubs,
        });

        checkError({ errorCode: 'ADD_IMPOSTER', response });

        // Without a port, mountebank picks one and returns it.
        const created = response.data as { port?: number } | undefined;
        const createdPort = created?.port ?? port;
        if (createdPort === undefined) {
            throw new MountebankError({
                operation: 'ADD_IMPOSTER',
                reason: "mountebank didn't say which port it used",
            });
        }
        return this.imposter(createdPort);
    }

    /**
     * A handle to an imposter: give its port, or the `ImposterBuilder` that defines it (its `port` is used). It makes
     * no request; the imposter doesn't have to exist yet.
     */
    imposter(imposter: number | Pick<Imposter, 'port'>): ImposterClient {
        const port = typeof imposter === 'number' ? imposter : imposter.port;
        if (port === undefined) {
            throw new Error('client.imposter() needs a port: this imposter definition has none');
        }
        return new ImposterClient(this.url, port, this.logger);
    }

    /** Lists every imposter on the server: its port, protocol, name and how many requests it received. */
    async getImposters(): Promise<ImposterSummary[]> {
        const response = await this.send('GET_IMPOSTERS', 'GET', `${this.url}/imposters`);

        checkError({ errorCode: 'GET_IMPOSTERS', response });

        const { imposters = [] } = response.data as { imposters?: ImposterSummary[] };
        return imposters.map(({ port, protocol, name, numberOfRequests }) => ({
            port,
            protocol,
            ...(name ? { name } : {}),
            numberOfRequests,
        }));
    }

    /**
     * Deletes every imposter on the server, with their stubs, recorded requests and `decorate` state. Use it to
     * start each test run (or test file) from a clean server.
     */
    async deleteImposters() {
        const response = await this.send('DELETE_IMPOSTERS', 'DELETE', `${this.url}/imposters`);

        checkError({ errorCode: 'DELETE_IMPOSTERS', response });
    }

    /**
     * Recreates each imposter from its definition: deletes whatever is on its port, then creates it again. Stubs
     * added later, recorded requests and `decorate` state are gone afterwards. Only these imposters' ports are
     * touched, so test files that use different ports can reset in parallel.
     */
    async resetImposters(imposters: Imposter[]) {
        await Promise.all(
            imposters.map(async (imposter) => {
                if (imposter.port === undefined) {
                    throw new Error('resetImposters needs a port on every imposter, to know which one to replace');
                }
                await this.imposter(imposter.port).delete();
                await this.createImposter(imposter);
            })
        );
    }

    /** mountebank's own log entries, oldest first. */
    async getLogs(): Promise<MountebankLog[]> {
        const response = await this.send('GET_LOGS', 'GET', `${this.url}/logs`);

        checkError({ errorCode: 'GET_LOGS', response });

        const { logs = [] } = response.data as { logs?: MountebankLog[] };
        return logs;
    }
}

/** One imposter on a mountebank server. Get it from `client.imposter(port)` or `client.createImposter(...)`. */
export class ImposterClient {
    constructor(
        /** The mountebank server's URL. */
        readonly url: string,
        readonly port: number,
        private readonly logger?: MountebankLogger
    ) {}

    private send(...[operation, method, url, body]: Parameters<typeof request>) {
        return request(operation, method, url, body, this.logger);
    }

    private get path() {
        return `${this.url}/imposters/${this.port}`;
    }

    /** The imposter as mountebank returns it, with its stubs and recorded requests. */
    async get(): Promise<ImposterDetails> {
        const response = await this.send('GET_IMPOSTER', 'GET', this.path);

        checkError({ errorCode: 'GET_IMPOSTER', response });

        return response.data as ImposterDetails;
    }

    /**
     * Deletes the imposter, with all its stubs and `decorate` state. Does nothing if there is none, so it's safe to
     * call before (re)creating an imposter.
     */
    async delete() {
        const response = await this.send('DELETE_IMPOSTER', 'DELETE', this.path);

        checkError({ errorCode: 'DELETE_IMPOSTER', response });
    }

    /** Adds a stub after the imposter's existing ones, so stubs added earlier match first. */
    async addStub(stub: Stub) {
        const response = await this.send('ADD_STUB', 'POST', `${this.path}/stubs`, { stub: { ...stub } });

        checkError({ errorCode: 'ADD_STUB', response });
    }

    /** Adds several stubs, in order. */
    async addStubs(stubs: Stub[]) {
        for (const stub of stubs) {
            await this.addStub(stub);
        }
    }

    /** Replaces all the imposter's stubs with `stubs`, in one call. */
    async replaceStubs(stubs: Stub[]) {
        const response = await this.send('REPLACE_STUBS', 'PUT', `${this.path}/stubs`, { stubs });

        checkError({ errorCode: 'REPLACE_STUBS', response });
    }

    /**
     * Deletes a stub: a `StubBuilder` (or anything with its `stubID`), or the ID itself. Throws if the imposter has
     * no such stub.
     */
    async deleteStub(stub: { stubID?: string } | string) {
        const stubID = typeof stub === 'string' ? stub : stub.stubID;
        const { stubs = [] } = await this.get();
        const index = stubs.findIndex((s) => stubID !== undefined && s.stubID === stubID);

        if (index === -1) {
            throw new MountebankError({
                operation: 'DELETE_STUB',
                reason: `no stub with ID ${stubID} on the imposter at port ${this.port} (already deleted, or the imposter was recreated?)`,
            });
        }

        const response = await this.send('DELETE_STUB', 'DELETE', `${this.path}/stubs/${index}`);

        checkError({ errorCode: 'DELETE_STUB', response });
    }

    /**
     * Returns the requests the imposter recorded, oldest first, optionally only those matching `filter`. The
     * imposter must be created with `recordRequests: true`; if it received requests without recording them, this
     * throws instead of returning an empty list.
     */
    async getRequests(filter?: RequestFilter): Promise<RecordedRequest[]> {
        const response = await this.send('GET_REQUESTS', 'GET', this.path);

        checkError({ errorCode: 'GET_REQUESTS', response });

        const imposter = response.data as ImposterDetails;
        const requests = imposter.requests ?? [];
        if (requests.length === 0 && (imposter.numberOfRequests ?? 0) > 0) {
            throw new MountebankError({
                operation: 'GET_REQUESTS',
                reason:
                    `the imposter at port ${this.port} received ${imposter.numberOfRequests} request(s) but ` +
                    `doesn't record them. Create it with recordRequests: true`,
            });
        }

        return requests.map(normalizeRequest).filter((recorded) => matchesFilter(recorded, filter));
    }

    /** Forgets the requests the imposter recorded, and resets its request count. */
    async clearRequests() {
        const response = await this.send('CLEAR_REQUESTS', 'DELETE', `${this.path}/savedRequests`);

        checkError({ errorCode: 'CLEAR_REQUESTS', response });
    }
}

/** Creates a client for the mountebank server at `url` (default: `MOUNTEBANK_URL`, then `http://localhost:2525`). */
export function createClient(options: ClientOptions = {}) {
    return new MountebankClient(options);
}
