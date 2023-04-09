import { ResponseRecord, ResponseType } from './types';

export interface IResponseBuilder extends Omit<IsResponse, 'statusCode'> {
    status: number;
}

export interface IsResponse {
    statusCode: number;
    headers?: ResponseRecord;
    body?: ResponseType;
}

export interface StandardResponse {
    is: IsResponse;
    repeat?: number;
    behaviors?: any; // TODO: Add type of behaviors;
}

export type Response = StandardResponse;
