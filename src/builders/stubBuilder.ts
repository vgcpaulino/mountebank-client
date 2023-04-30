import { Predicate, Response, IsResponseBuilder, ProxyResponseBuilder } from '../interfaces';
import { addStub, deleteStubByID } from '../client/mountebankClient';
import { PredicateBuilder } from './predicateBuilder';
import { ResponseBuilder } from './responseBuilder';
import { OperatorTypes, ResponseRecord } from '../interfaces/types';
import { randomUUID } from 'crypto';

interface Options {
    operator?: OperatorTypes;
    query?: ResponseRecord | string;
    mutation?: string;
    args?: Record<string, string | number | boolean>;
}

export class StubBuilder {
    stubID: string;
    imposterPort?: number;
    predicates: Predicate[];
    responses: Response[];

    constructor({ imposterPort }: { imposterPort?: number } = {}) {
        this.stubID = randomUUID();
        this.imposterPort = imposterPort;
        this.predicates = [];
        this.responses = [];
    }

    addPredicate(predicate: Predicate) {
        this.predicates.push(predicate);
        return this;
    }

    addResponse(response: Response) {
        this.responses.push(response);
        return this;
    }

    any({ operator = 'equals', query, mutation, args }: Options) {
        this.predicates.push(new PredicateBuilder({ operator, query, mutation, args }));
        return this;
    }

    get(path: string, { operator = 'equals' }: Options = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'GET', path }));
        return this;
    }

    post(path: string, { operator = 'equals' }: Options = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'POST', path }));
        return this;
    }

    put(path: string, { operator = 'equals' }: Options = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'PUT', path }));
        return this;
    }

    patch(path: string, { operator = 'equals' }: Options = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'PATCH', path }));
        return this;
    }

    delete(path: string, { operator = 'equals' }: Options = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'DELETE', path }));
        return this;
    }

    options(path: string, { operator = 'equals' }: Options = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'OPTIONS', path }));
        return this;
    }

    response({
        status,
        headers,
        body,
        data,
        decorate,
        repeat,
        copyFromHeader,
        copyFromPath,
        copyFromBody,
        copyFromQuery,
    }: IsResponseBuilder) {
        this.responses.push(
            new ResponseBuilder({
                status,
                headers,
                body,
                data,
                decorate,
                repeat,
                copyFromHeader,
                copyFromPath,
                copyFromBody,
                copyFromQuery,
            }).generate()
        );
        return this;
    }

    multipleResponses(responses: IsResponseBuilder[]) {
        responses.forEach((r: IsResponseBuilder) => this.response(r));
        return this;
    }

    proxyResponse({ url, proxyMode, decorate }: ProxyResponseBuilder) {
        this.responses.push(new ResponseBuilder({ url, proxyMode, decorate }).generateProxy());
        return this;
    }

    async addStub() {
        await addStub({ imposterPort: this.imposterPort, stub: this });
        return this;
    }

    async deleteStub() {
        await deleteStubByID({ imposterPort: this.imposterPort, stubID: this.stubID });
        return this;
    }
}
