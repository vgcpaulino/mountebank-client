import { Stub } from './stub';
import { ResponseType, ResponseRecord } from './types';

export type ImposterProtocol = 'http' | 'https';

export interface ImposterDefaultResponse {
    statusCode: number;
    headers: ResponseRecord;
    body: ResponseType;
}

export interface Imposter {
    port?: number;
    protocol: ImposterProtocol;
    name?: string;
    defaultResponse?: ImposterDefaultResponse;
    stubs?: Stub[];
}
