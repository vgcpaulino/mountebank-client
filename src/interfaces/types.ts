import { Config } from './config';

export type Operator = 'contains' | 'equals' | 'endsWith' | 'startsWith' | 'matches';
export type HttpMethod = 'DELETE' | 'GET' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';
export type ResponseRecord = Record<string, string | number | boolean | string[]>;
export type DecorateFunction = (config: Config) => void;
export type ProxyMode = 'proxyOnce' | 'proxyAlways' | 'proxyTransparent';
export type LogLevel = 'debug' | 'error' | 'info' | 'warn';
