export type ImposterProtocol = 'http' | 'https';

export interface Imposter {
    port: number,
    protocol: ImposterProtocol;
    name?: string;
}