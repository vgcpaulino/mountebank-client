import { Imposter, ImposterDefaultResponse, ImposterProtocol, Stub } from '../interfaces';
import { addImposter } from '../client/mountebankClient';
import { StubBuilder } from './stubBuilder';

export interface IImposterBuilder {
    port: number;
    protocol: ImposterProtocol;
    name?: string;
    schema?: string;
    allowCORS?: boolean;
    /** Record every request the imposter receives, so tests can read them with `getRequests`. */
    recordRequests?: boolean;
}

interface IDefaultResponse extends Omit<ImposterDefaultResponse, 'statusCode'> {
    status: number;
}

export class ImposterBuilder {
    port?: number;
    protocol: ImposterProtocol;
    name?: string;
    schema?: string;
    allowCORS?: boolean;
    recordRequests?: boolean;
    defaultResponse?: ImposterDefaultResponse;
    stubs: Stub[];

    constructor({ port, protocol, name, schema, allowCORS, recordRequests }: IImposterBuilder) {
        this.port = port;
        this.protocol = protocol;
        this.name = name;
        this.schema = schema;
        this.allowCORS = allowCORS;
        this.recordRequests = recordRequests;
        this.stubs = [];
    }

    addDefaultResponse({ status, headers, body }: IDefaultResponse) {
        this.defaultResponse = {
            statusCode: status,
            headers,
            body,
        };
        return this;
    }

    /**
     * Adds a stub to this imposter. A `StubBuilder` without an `imposterPort` is tied to this imposter's port, so a
     * later `stub.addStub()` or `stub.deleteStub()` reaches this imposter instead of the default port.
     */
    addStub(stub: Stub) {
        this.tieToThisImposter(stub);
        this.stubs.push(stub);
        return this;
    }

    addStubs(stubs: Stub[]) {
        stubs.forEach((stub) => this.addStub(stub));
        return this;
    }

    private tieToThisImposter(stub: Stub & { imposterPort?: number }) {
        if (stub instanceof StubBuilder && stub.imposterPort === undefined && this.port !== undefined) {
            stub.imposterPort = this.port;
        }
    }

    async addImposter() {
        await addImposter({
            port: this.port,
            protocol: this.protocol,
            name: this.name,
            schema: this.schema,
            allowCORS: this.allowCORS,
            recordRequests: this.recordRequests,
            stubs: this.stubs,
            defaultResponse: this.defaultResponse,
        });
        return this;
    }
}
