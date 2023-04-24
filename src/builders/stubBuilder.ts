import { Predicate, Response, IsResponseBuilder, ProxyResponseBuilder } from '../interfaces';
import { addStub } from '../client/mountebankClient';
import { PredicateBuilder } from './predicateBuilder';
import { ResponseBuilder } from './responseBuilder';
import { ResponseRecord } from '../interfaces/types';

interface Options {
    query?: ResponseRecord | string;
    mutation?: string;
    args?: Record<string, string | number | boolean>;
}

export class StubBuilder {
    predicates: Predicate[];
    responses: Response[];

    constructor() {
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

    any({ query, mutation, args }: Options) {
        this.predicates.push(new PredicateBuilder({ operator: 'equals', query, mutation, args }));
        return this;
    }

    get(path: string) {
        this.predicates.push(new PredicateBuilder({ operator: 'equals', method: 'GET', path }));
        return this;
    }

    post(path: string) {
        this.predicates.push(new PredicateBuilder({ operator: 'equals', method: 'POST', path }));
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

    proxyResponse({ url, proxyMode, decorate }: ProxyResponseBuilder) {
        this.responses.push(new ResponseBuilder({ url, proxyMode, decorate }).generateProxy());
        return this;
    }

    async addStub() {
        await addStub({ stub: this });
        return this;
    }
}
