import { Config } from './config';

export type OperatorTypes = 'equals' | 'endsWith' | 'startsWith';
export type ResponseRecord = Record<string, string | number | boolean>;
export type ResponseType = string | ResponseRecord | ResponseRecord[]; // TODO: REMOVE ME;
export type DecorateFunctionType = (config: Config) => void;
export type ProxyModeTypes = 'proxyOnce' | 'proxyAlways' | 'proxyTransparent';
