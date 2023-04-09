import { Stub, Imposter, ImposterProtocol, ImposterDefaultResponse } from '../interfaces';

interface IImposterBuilder {
    port: number;
    protocol: ImposterProtocol;
    name?: string;
}

interface IDefaultReponse extends Omit<ImposterDefaultResponse, 'statusCode'> {
    status: number;
}

export class ImposterBuilder {
    port?: number;
    protocol: ImposterProtocol;
    name?: string;
    defaultResponse?: ImposterDefaultResponse;
    stubs: Stub[];

    constructor({ port, protocol, name }: IImposterBuilder) {
        this.port = port;
        this.protocol = protocol;
        this.name = name;
        this.stubs = [];
    }

    addDefaultReponse({ status, headers, body }: IDefaultReponse) {
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

    generate(): Imposter {
        return this;
    }
}
