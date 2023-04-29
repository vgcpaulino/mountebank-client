import axios from 'axios';
import { checkError } from './errorHelper';
import { Stub, ImposterProtocol, ImposterDefaultResponse } from '../interfaces';

const defaultProviderUrl = process.env['MOUNTEBANK_URL'] || 'http://localhost:2525';
const defaultImposterPort = parseInt(process.env['MOUNTEBANK_IMPOSTER_DEFAULT_PORT'] || '') || 7117;

interface IAddImposter {
    providerUrl?: string;
    port?: number;
    protocol: ImposterProtocol;
    name?: string;
    schema?: string;
    defaultResponse?: ImposterDefaultResponse;
    stubs?: Stub[];
}

export async function addImposter({
    providerUrl = defaultProviderUrl,
    port = defaultImposterPort,
    protocol = 'https',
    name = '',
    schema = '',
    defaultResponse = undefined,
    stubs = [],
}: IAddImposter) {
    const body: {
        port: string | number;
        protocol: ImposterProtocol;
        name?: string;
        schema?: string;
        defaultResponse?: ImposterDefaultResponse;
        stubs: Stub[];
    } = {
        port,
        protocol,
        name,
        schema,
        defaultResponse,
        stubs,
    };

    const response = await axios.post(`${providerUrl}/imposters`, stringify(body), { validateStatus: null });

    checkError({ errorCode: 'ADD_IMPOSTER', response });
}

export async function getImposter({ providerUrl = defaultProviderUrl, port = defaultImposterPort } = {}) {
    const response = await axios.get(`${providerUrl}/imposters/${port}`, { validateStatus: null });

    checkError({ errorCode: 'GET_IMPOSTER', response });

    return response.data;
}

export async function addStub({
    providerUrl = defaultProviderUrl,
    imposterPort = defaultImposterPort,
    stub,
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
} = {}) {
    const response = await getImposter({ providerUrl, port: imposterPort });
    const stub = response.stubs.find((s: Stub) => s.stubID === stubID);
    const stubIndex = getStubIndex(stub);

    return deleteStubByIndex({ providerUrl, imposterPort, stubIndex });
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

const stringify = (object: Record<any, any>) => {
    return JSON.stringify(object);
};

function getStubIndex(stub: Stub) {
    const href = stub._links?.self.href;
    if (href) {
        // TODO: substr is deprecated;
        return href.substr(href.lastIndexOf('/') + 1);
    }
    return undefined;
}
