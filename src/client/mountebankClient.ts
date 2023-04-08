import axios from 'axios';
import { checkError } from './errorHelper';

const defaultProviderUrl = process.env['MOUNTEBANK_URL'] || 'http://localhost:2525';
const defaultImposterPort = process.env['MOUNTEBANK_IMPOSTER_DEFAULT_PORT'] || 7117;

export async function addImposter({
    providerUrl = defaultProviderUrl,
    port = defaultImposterPort,
    protocol = 'https',
    name = '',
} = {}) {
    const body: {
        port: string | number;
        protocol: string;
        name?: string;
    } = {
        port,
        protocol, 
        name,
    };

    const response = await axios.post(`${providerUrl}/imposters`, stringify(body), { validateStatus: null });

    checkError({ errorCode: 'ADD_IMPOSTER', response });
}

const stringify = (object: Record<any, any>) => { return JSON.stringify(object) };


