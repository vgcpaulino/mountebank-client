import { Imposter, ImposterDefaultResponse, ImposterProtocol, ImposterSummary, LogLevel, RecordedRequest, RequestFilter, Stub } from '../interfaces';
import { matchesFilter, normalizeRequest } from './requestFilter';
import { checkError, MountebankError } from './errorHelper';

export { MountebankError } from './errorHelper';
export type { MountebankErrorDetail, MountebankOperation } from './errorHelper';
import axios from 'axios';

const defaultProviderUrl = process.env['MOUNTEBANK_URL'] || 'http://localhost:2525';
const defaultImposterPort = parseInt(process.env['MOUNTEBANK_IMPOSTER_DEFAULT_PORT'] || '') || 7117;

interface IAddImposter {
    providerUrl?: string;
    port?: number;
    protocol: ImposterProtocol;
    name?: string;
    schema?: string;
    allowCORS?: boolean;
    recordRequests?: boolean;
    defaultResponse?: ImposterDefaultResponse;
    stubs?: Stub[];
}

export async function addImposter({
    providerUrl = defaultProviderUrl,
    port = defaultImposterPort,
    protocol = 'https',
    name = '',
    schema = '',
    allowCORS = undefined,
    recordRequests = undefined,
    defaultResponse = undefined,
    stubs = [],
}: IAddImposter) {
    const body: {
        port: string | number;
        protocol: ImposterProtocol;
        name?: string;
        schema?: string;
        allowCORS?: boolean;
        recordRequests?: boolean;
        defaultResponse?: ImposterDefaultResponse;
        stubs: Stub[];
    } = {
        port,
        protocol,
        name,
        schema,
        allowCORS,
        recordRequests,
        defaultResponse,
        stubs,
    };

    const response = await axios.post(`${providerUrl}/imposters`, stringify(body), {
        validateStatus: null,
    });

    checkError({ errorCode: 'ADD_IMPOSTER', response });
}

/**
 * Deletes the imposter on `port`, with all its stubs and `decorate` state. Does nothing if there is none, so it's
 * safe to call before (re)creating an imposter.
 */
export async function deleteImposter({ providerUrl = defaultProviderUrl, port = defaultImposterPort } = {}) {
    const response = await axios.delete(`${providerUrl}/imposters/${port}`, { validateStatus: null });

    checkError({ errorCode: 'DELETE_IMPOSTER', response });
}

/** Lists every imposter on the server: its port, protocol, name and how many requests it received. */
export async function getImposters({ providerUrl = defaultProviderUrl } = {}): Promise<ImposterSummary[]> {
    const response = await axios.get(`${providerUrl}/imposters`, { validateStatus: null });

    checkError({ errorCode: 'GET_IMPOSTERS', response });

    return (response.data?.imposters ?? []).map(({ port, protocol, name, numberOfRequests }: ImposterSummary) => ({
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
export async function deleteImposters({ providerUrl = defaultProviderUrl } = {}) {
    const response = await axios.delete(`${providerUrl}/imposters`, { validateStatus: null });

    checkError({ errorCode: 'DELETE_IMPOSTERS', response });
}

/**
 * Replaces all stubs on the imposter at `imposterPort` with `stubs`, in one call. A `StubBuilder` without an
 * `imposterPort` is tied to this imposter, as with `ImposterBuilder.addStub`.
 */
export async function replaceStubs({
    providerUrl = defaultProviderUrl,
    imposterPort = defaultImposterPort,
    stubs,
}: {
    providerUrl?: string;
    imposterPort?: number;
    stubs: Stub[];
}) {
    stubs.forEach((stub) => {
        const builder = stub as Stub & { imposterPort?: number };
        if ('imposterPort' in builder && builder.imposterPort === undefined) {
            builder.imposterPort = imposterPort;
        }
    });
    const response = await axios.put(`${providerUrl}/imposters/${imposterPort}/stubs`, stringify({ stubs }), {
        validateStatus: null,
    });

    checkError({ errorCode: 'REPLACE_STUBS', response });
}

/**
 * Returns the requests the imposter at `imposterPort` recorded, oldest first, optionally only those matching
 * `filter`. The imposter must be created with `recordRequests: true`; if it received requests without recording
 * them, this throws instead of returning an empty list.
 */
export async function getRequests({
    providerUrl = defaultProviderUrl,
    imposterPort = defaultImposterPort,
    filter,
}: {
    providerUrl?: string;
    imposterPort?: number;
    filter?: RequestFilter;
} = {}): Promise<RecordedRequest[]> {
    const response = await axios.get(`${providerUrl}/imposters/${imposterPort}`, { validateStatus: null });

    checkError({ errorCode: 'GET_REQUESTS', response });

    const requests: Record<string, unknown>[] = response.data?.requests ?? [];
    if (requests.length === 0 && (response.data?.numberOfRequests ?? 0) > 0) {
        throw new MountebankError({
            operation: 'GET_REQUESTS',
            reason:
                `the imposter at port ${imposterPort} received ${response.data.numberOfRequests} request(s) but ` +
                `doesn't record them. Create it with recordRequests: true`,
        });
    }

    return requests.map(normalizeRequest).filter((request) => matchesFilter(request, filter));
}

/** Forgets the requests the imposter at `imposterPort` recorded, and resets its request count. */
export async function clearRequests({ providerUrl = defaultProviderUrl, imposterPort = defaultImposterPort } = {}) {
    const response = await axios.delete(`${providerUrl}/imposters/${imposterPort}/savedRequests`, {
        validateStatus: null,
    });

    checkError({ errorCode: 'CLEAR_REQUESTS', response });
}

export async function getImposter({ providerUrl = defaultProviderUrl, port = defaultImposterPort } = {}) {
    const response = await axios.get(`${providerUrl}/imposters/${port}`, {
        validateStatus: null,
    });

    checkError({ errorCode: 'GET_IMPOSTER', response });

    return response.data;
}

export async function addStub({
    providerUrl = defaultProviderUrl,
    imposterPort = defaultImposterPort,
    stub,
    defaultHeaders = true,
}: {
    providerUrl?: string;
    imposterPort?: string | number;
    stub: Stub;
    defaultHeaders?: boolean;
}) {
    const response = await axios.post(
        `${providerUrl}/imposters/${imposterPort}/stubs`,
        stringify({ stub: { ...stub } }),
        { validateStatus: null }
    );

    checkError({ errorCode: 'ADD_STUB', response });
}

export async function deleteStubByID({
    providerUrl = defaultProviderUrl,
    imposterPort = defaultImposterPort,
    stubID,
}: {
    providerUrl?: string;
    imposterPort?: number;
    stubID?: string;
} = {}): Promise<Imposter> {
    const imposter: Imposter = await getImposter({ providerUrl, port: imposterPort });
    const stub = imposter.stubs?.find((s: Stub) => s.stubID === stubID);
    const stubIndex = stub ? getStubIndex(stub) : undefined;

    if (stubIndex === undefined) {
        throw new MountebankError({
            operation: 'DELETE_STUB',
            reason: `no stub with ID ${stubID} on the imposter at port ${imposterPort} (already deleted, or the imposter was recreated?)`,
        });
    }

    return deleteStubByIndex({ providerUrl, imposterPort, stubIndex });
}

/** Deletes several stubs by ID. Throws (and stops) at the first ID that isn't on the imposter. */
export async function deleteStubsByID({
    providerUrl = defaultProviderUrl,
    imposterPort = defaultImposterPort,
    stubIDs,
}: {
    providerUrl?: string;
    imposterPort?: number;
    stubIDs?: string[];
} = {}): Promise<Imposter | undefined> {
    let imposter: Imposter | undefined;
    for (const stubID of stubIDs ?? []) {
        imposter = await deleteStubByID({ providerUrl, imposterPort, stubID });
    }
    return imposter;
}

export async function deleteStubByIndex({
    providerUrl = defaultProviderUrl,
    imposterPort = defaultImposterPort,
    stubIndex,
}: {
    providerUrl?: string;
    imposterPort?: number;
    stubIndex?: string;
} = {}) {
    const response = await axios.delete(`${providerUrl}/imposters/${imposterPort}/stubs/${stubIndex}`, {
        validateStatus: null,
    });

    checkError({ errorCode: 'DELETE_STUB', response });

    return response.data;
}

export async function getLogs({ providerUrl = defaultProviderUrl } = {}) {
    const response = await axios.get(`${providerUrl}/logs`, {
        validateStatus: null,
    });

    checkError({ errorCode: 'GET_LOGS', response });

    const logs: { level: LogLevel; message: string; timestamp: string }[] = response.data?.logs;
    return logs;
}

const stringify = (object: Record<any, any>) => {
    return JSON.stringify(object);
};

function getStubIndex(stub: Stub) {
    const href = stub._links?.self.href;
    if (href) {
        const index = href.lastIndexOf('/');
        return href.slice(index + 1, href.length);
    }
    return undefined;
}
