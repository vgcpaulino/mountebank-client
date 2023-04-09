type ResponseRecord = Record<string, string | number | boolean>;
type ResponseType = string | ResponseRecord;

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
