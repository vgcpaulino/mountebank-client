import axios from 'axios';
import { checkError } from './errorHelper';
import { Stub } from '../interfaces';

const defaultProviderUrl = process.env['MOUNTEBANK_URL'] || 'http://localhost:2525';
const defaultImposterPort = parseInt(process.env['MOUNTEBANK_IMPOSTER_DEFAULT_PORT'] || '') || 7117;

interface IAddImposter {
    providerUrl: string;
    port: number;
    protocol: string;
    name?: string;
    stubs?: any[];
}
export async function addImposter({
    providerUrl = defaultProviderUrl,
    port = defaultImposterPort,
    protocol = 'https',
    name = '',
    stubs = [],
}: IAddImposter) {
    const body: {
        port: string | number;
        protocol: string;
        name?: string;
        stubs: any[];
    } = {
        port,
        protocol,
        name,
        stubs,
    };

    const response = await axios.post(`${providerUrl}/imposters`, stringify(body), { validateStatus: null });

    checkError({ errorCode: 'ADD_IMPOSTER', response });
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

const stringify = (object: Record<any, any>) => {
    return JSON.stringify(object);
};
