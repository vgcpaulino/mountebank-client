import { IsResponseBuilder, Predicate, ProxyResponseBuilder, Response } from '../interfaces';
import { OperatorTypes, ResponseRecord } from '../interfaces/types';
import { PredicateBuilder } from './predicateBuilder';
import { ResponseBuilder } from './responseBuilder';
import { addStub, deleteStubByID } from '../client/mountebankClient';
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
        wait,
        decorate,
        chaos,
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
                wait,
                decorate,
                chaos,
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

    proxyResponse({ url, proxyMode, decorate, wait, chaos }: ProxyResponseBuilder) {
        if (chaos && proxyMode === 'proxyOnce') {
            // mountebank records the proxied response after behaviors run, so proxyOnce would record one
            // chaos outcome (possibly an injected error) and replay it on every later call, with no more chaos.
            throw new Error(
                "chaos can't be used with proxyMode 'proxyOnce': mountebank would record the first (possibly " +
                    "failed) response and replay it forever. Use 'proxyTransparent' (the default with chaos) or 'proxyAlways'."
            );
        }
        // Without recording, every call goes to the backend and gets its own chaos.
        const mode = proxyMode ?? (chaos ? 'proxyTransparent' : undefined);
        this.responses.push(new ResponseBuilder({ url, proxyMode: mode, decorate, wait, chaos }).generateProxy());
        return this;
    }

    async addStub() {
        await addStub({ imposterPort: this.imposterPort, stub: this });
        return this;
    }

    async deleteStub() {
        await deleteStubByID({
            imposterPort: this.imposterPort,
            stubID: this.stubID,
        });
        return this;
    }
}
