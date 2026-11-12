import { Behavior, Chaos, CopyFromHeaderOrQuery, CopyFromPathOrBody } from './behavior';
import { DecorateFunction, ProxyMode, ResponseRecord } from './types';

/** A decorate function, its source as a string, or several of them (applied in order). */
export type DecorateInput = string | DecorateFunction | (string | DecorateFunction)[];

interface CommonResponseOptions {
    decorate?: DecorateInput;
    chaos?: Chaos;
}

export interface ResponseOptions extends CommonResponseOptions, Omit<IsResponse, 'statusCode'> {
    status?: number;
    wait?: number;
    repeat?: number;
    copyFromHeader?: CopyFromHeaderOrQuery;
    copyFromQuery?: CopyFromHeaderOrQuery;
    copyFromPath?: CopyFromPathOrBody;
    copyFromBody?: CopyFromPathOrBody;
}

export interface ProxyOptions extends CommonResponseOptions {
    url?: string;
    proxyMode?: ProxyMode;
    wait?: number;
}

export interface ResponseBuilderOptions extends ResponseOptions, ProxyOptions {}

export interface IsResponse {
    statusCode?: number;
    headers?: ResponseRecord;
    body?: unknown;
    data?: unknown;
}

/** A stub response that returns a fixed response (mountebank's `is`). */
export interface IsResponseDefinition {
    is: IsResponse;
    repeat?: number;
    behaviors?: Behavior[];
}

export interface ProxyConfig {
    to: string;
    mode: ProxyMode;
    addWaitBehavior: boolean;
}

/** A stub response that forwards to another server (mountebank's `proxy`). */
export interface ProxyResponseDefinition {
    proxy: ProxyConfig;
    repeat?: number;
    behaviors?: Behavior[];
}

export interface Response {
    is?: IsResponse;
    proxy?: ProxyConfig;
    repeat?: number;
    behaviors?: Behavior[];
}
