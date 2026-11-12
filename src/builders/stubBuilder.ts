import { ResponseOptions, Predicate, ProxyOptions, Response } from '../interfaces';
import { Operator, ResponseRecord } from '../interfaces/types';
import { PredicateBuilder } from './predicateBuilder';
import { ResponseBuilder } from './responseBuilder';
import { randomUUID } from 'crypto';

/** How a stub matches: the comparison `operator` and, for GraphQL, the operation to match. */
export interface MatchOptions {
    operator?: Operator;
    query?: ResponseRecord | string;
    mutation?: string;
    args?: Record<string, string | number | boolean>;
}

/**
 * Describes a stub: which requests it matches and how it responds. It only holds the definition; add it to an
 * `ImposterBuilder`, or to a running imposter with `client.imposter(port).addStub(stub)`.
 */
export class StubBuilder {
    /** Identifies the stub on the server, so `client.imposter(port).deleteStub(stub)` can find it. */
    stubID: string;
    predicates: Predicate[];
    responses: Response[];

    constructor() {
        this.stubID = randomUUID();
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

    any({ operator = 'equals', query, mutation, args }: MatchOptions) {
        this.predicates.push(new PredicateBuilder({ operator, query, mutation, args }));
        return this;
    }

    get(path: string, { operator = 'equals' }: MatchOptions = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'GET', path }));
        return this;
    }

    post(path: string, { operator = 'equals' }: MatchOptions = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'POST', path }));
        return this;
    }

    put(path: string, { operator = 'equals' }: MatchOptions = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'PUT', path }));
        return this;
    }

    patch(path: string, { operator = 'equals' }: MatchOptions = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'PATCH', path }));
        return this;
    }

    delete(path: string, { operator = 'equals' }: MatchOptions = {}) {
        this.predicates.push(new PredicateBuilder({ operator, method: 'DELETE', path }));
        return this;
    }

    options(path: string, { operator = 'equals' }: MatchOptions = {}) {
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
    }: ResponseOptions) {
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

    multipleResponses(responses: ResponseOptions[]) {
        responses.forEach((r: ResponseOptions) => this.response(r));
        return this;
    }

    proxyResponse({ url, proxyMode, decorate, wait, chaos }: ProxyOptions) {
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
}
