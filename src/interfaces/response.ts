import { Behavior, ICopyFromHeader, ICopyFromPathBody } from './behavior';
import { DecorateFunctionType, ResponseRecord, ResponseType } from './types';

export interface IResponseBuilder extends Omit<IsResponse, 'statusCode'> {
    status: number;
    wait?: number;
    decorate?: string | string[] | DecorateFunctionType | DecorateFunctionType[];
    repeat?: number;
    copyFromHeader?: ICopyFromHeader;
    copyFromPath?: ICopyFromPathBody;
    copyFromBody?: ICopyFromPathBody;
}

export interface IsResponse {
    statusCode: number;
    headers?: ResponseRecord;
    body?: ResponseType;
}

export interface StandardResponse {
    is: IsResponse;
    repeat?: number;
    behaviors?: Behavior[];
}

export type Response = StandardResponse;
