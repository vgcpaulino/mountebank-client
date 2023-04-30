import { RequestMethodsTypes } from './types';

interface Request {
    requestFrom: string;
    method: RequestMethodsTypes;
    path: string;
    query: Record<string, string>;
    headers: Record<string, string>;
    body: any;
    ip: string;
}

interface Response {
    statusCode?: number;
    headers?: Record<string, any>;
    body?: any;
    _mode?: 'text';
    _proxyResponseTime?: number;
}

interface Logger {
    debug: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
}

export interface Config {
    logger: Logger;
    request: Request;
    response: Response;
}
