import { Behavior, Chaos, ICopyFromHeaderQuery, ICopyFromPathBody } from './behavior';
import { DecorateFunctionType, ProxyModeTypes, ResponseRecord } from './types';

/** A decorate function, its source as a string, or several of them (applied in order). */
export type DecorateInput = string | DecorateFunctionType | (string | DecorateFunctionType)[];

interface CommonBuilder {
    decorate?: DecorateInput;
    chaos?: Chaos;
}

export interface IsResponseBuilder extends CommonBuilder, Omit<IsResponse, 'statusCode'> {
    status?: number;
    wait?: number;
    repeat?: number;
    copyFromHeader?: ICopyFromHeaderQuery;
    copyFromQuery?: ICopyFromHeaderQuery;
    copyFromPath?: ICopyFromPathBody;
    copyFromBody?: ICopyFromPathBody;
}

export interface ProxyResponseBuilder extends CommonBuilder {
    url?: string;
    proxyMode?: ProxyModeTypes;
    wait?: number;
}

export interface IResponseBuilder extends IsResponseBuilder, ProxyResponseBuilder {}

export interface IsResponse {
    statusCode?: number;
    headers?: ResponseRecord;
    body?: unknown;
    data?: unknown;
}

// TODO: Still needed?
export interface StandardResponse {
    is: IsResponse;
    repeat?: number;
    behaviors?: Behavior[];
}

export interface ProxyResponseOptions {
    to: string;
    mode: ProxyModeTypes;
    addWaitBehavior: boolean;
}

// TODO: Still needed?
export interface ProxyResponse {
    proxy: ProxyResponseOptions;
    repeat?: number;
    behaviors?: Behavior[];
}

export interface Response {
    is?: IsResponse;
    proxy?: ProxyResponseOptions;
    repeat?: number;
    behaviors?: Behavior[];
}
