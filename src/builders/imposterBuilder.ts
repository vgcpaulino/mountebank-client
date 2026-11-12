import { ImposterDefaultResponse, ImposterProtocol, Stub } from '../interfaces';

export interface ImposterOptions {
    port: number;
    protocol: ImposterProtocol;
    name?: string;
    /** GraphQL imposters: the schema (SDL) mb-graphql serves. */
    schema?: string;
    allowCORS?: boolean;
    /** Record every request the imposter receives, so tests can read them with `getRequests`. */
    recordRequests?: boolean;
}

/** What an imposter returns for a request no stub matches. */
export interface DefaultResponseOptions extends Omit<ImposterDefaultResponse, 'statusCode'> {
    status: number;
}

/**
 * Describes an imposter: its port, protocol and stubs. It only holds the definition; create it on a server with
 * `client.createImposter(imposter)`.
 */
export class ImposterBuilder {
    port: number;
    protocol: ImposterProtocol;
    name?: string;
    schema?: string;
    allowCORS?: boolean;
    recordRequests?: boolean;
    defaultResponse?: ImposterDefaultResponse;
    stubs: Stub[];

    constructor({ port, protocol, name, schema, allowCORS, recordRequests }: ImposterOptions) {
        this.port = port;
        this.protocol = protocol;
        this.name = name;
        this.schema = schema;
        this.allowCORS = allowCORS;
        this.recordRequests = recordRequests;
        this.stubs = [];
    }

    addDefaultResponse({ status, headers, body }: DefaultResponseOptions) {
        this.defaultResponse = {
            statusCode: status,
            headers,
            body,
        };
        return this;
    }

    addStub(stub: Stub) {
        this.stubs.push(stub);
        return this;
    }

    addStubs(stubs: Stub[]) {
        stubs.forEach((stub) => this.addStub(stub));
        return this;
    }
}
