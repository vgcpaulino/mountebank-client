import { Stub } from './stub';
import { ResponseRecord } from './types';

export type ImposterProtocol = 'http' | 'https' | 'graphql';

export interface ImposterDefaultResponse {
    statusCode: number;
    headers?: ResponseRecord;
    body?: unknown;
}

export interface Imposter {
    port?: number;
    protocol: ImposterProtocol;
    name?: string;
    defaultResponse?: ImposterDefaultResponse;
    schema?: string;
    stubs?: Stub[];
}
