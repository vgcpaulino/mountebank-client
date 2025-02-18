import { Imposter, ImposterDefaultResponse, ImposterProtocol, Stub } from '../interfaces';
import { addImposter } from '../client/mountebankClient';

export interface IImposterBuilder {
    port: number;
    protocol: ImposterProtocol;
    name?: string;
    schema?: string;
}

interface IDefaultReponse extends Omit<ImposterDefaultResponse, 'statusCode'> {
    status: number;
}

export class ImposterBuilder {
    port?: number;
    protocol: ImposterProtocol;
    name?: string;
    schema?: string;
    defaultResponse?: ImposterDefaultResponse;
    stubs: Stub[];

    constructor({ port, protocol, name, schema }: IImposterBuilder) {
        this.port = port;
        this.protocol = protocol;
        this.name = name;
        this.schema = schema;
        this.stubs = [];
    }

    addDefaultResponse({ status, headers, body }: IDefaultReponse) {
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

    async addImposter() {
        await addImposter({
            port: this.port,
            protocol: this.protocol,
            name: this.name,
            schema: this.schema,
            stubs: this.stubs,
            defaultResponse: this.defaultResponse,
        });
        return this;
    }
}
