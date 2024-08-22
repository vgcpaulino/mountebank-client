import { Behavior, ICopyFromHeaderQuery, ICopyFromPathBody } from './behavior';
import { DecorateFunctionType, ProxyModeTypes, ResponseRecord } from './types';

interface CommonBuilder {
  decorate?: string | string[] | DecorateFunctionType | DecorateFunctionType[];
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
