import { Imposter, ImposterDefaultResponse, ImposterProtocol, LogLevel, Stub } from '../interfaces';
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
    defaultResponse = undefined,
    stubs = [],
}: IAddImposter) {
    const body: {
        port: string | number;
        protocol: ImposterProtocol;
        name?: string;
        schema?: string;
        allowCORS?: boolean;
        defaultResponse?: ImposterDefaultResponse;
        stubs: Stub[];
    } = {
        port,
        protocol,
        name,
        schema,
        allowCORS,
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
