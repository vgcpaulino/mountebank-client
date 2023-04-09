import { Behavior } from './behavior';
import { ResponseRecord, ResponseType } from './types';

export interface IResponseBuilder extends Omit<IsResponse, 'statusCode'> {
    status: number;
    wait?: number;
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
