import { Stub } from './stub';

export type ImposterProtocol = 'http' | 'https';

export interface Imposter {
    port: number;
    protocol: ImposterProtocol;
    name?: string;
    stubs?: Stub[];
}
