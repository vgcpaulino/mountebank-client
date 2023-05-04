import { Config } from './config';

export type OperatorTypes = 'contains' | 'equals' | 'endsWith' | 'startsWith';
export type RequestMethodsTypes = 'DELETE' | 'GET' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';
export type ResponseRecord = Record<string, string | number | boolean | string[]>;
export type ResponseType = string | ResponseRecord | ResponseRecord[]; // TODO: REMOVE ME;
export type DecorateFunctionType = (config: Config) => void;
export type ProxyModeTypes = 'proxyOnce' | 'proxyAlways' | 'proxyTransparent';
export type LogLevel = 'debug' | 'error' | 'info' | 'warn';
