import { Config } from './config';

export type ResponseRecord = Record<string, string | number | boolean>;
export type ResponseType = string | ResponseRecord;
export type DecorateFunctionType = (config: Config) => void;
export type ProxyModeTypes = 'proxyOnce' | 'proxyAlways' | 'proxyTransparent';
