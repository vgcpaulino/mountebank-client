import { Imposter, ImposterDefaultResponse, ImposterProtocol, Stub } from '../interfaces';
import { addImposter } from '../client/mountebankClient';

export interface IImposterBuilder {
    port: number;
    protocol: ImposterProtocol;
    name?: string;
    schema?: string;
    allowCORS?: boolean;
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
    defaultResponse?: ImposterDefaultResponse;
    stubs: Stub[];

    constructor({ port, protocol, name, schema, allowCORS }: IImposterBuilder) {
        this.port = port;
        this.protocol = protocol;
        this.name = name;
        this.schema = schema;
        this.allowCORS = allowCORS;
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

    addStub(stub: Stub) {
        this.stubs.push(stub);
        return this;
    }

    addStubs(stubs: Stub[]) {
        this.stubs.push(...stubs);
        return this;
    }

    async addImposter() {
        await addImposter({
            port: this.port,
            protocol: this.protocol,
            name: this.name,
            schema: this.schema,
            allowCORS: this.allowCORS,
            stubs: this.stubs,
            defaultResponse: this.defaultResponse,
        });
        return this;
    }
}
