import { Predicate, Response, IResponseBuilder } from '../interfaces';
import { addStub } from '../client/mountebankClient';
import { PredicateBuilder } from './predicateBuilder';
import { ResponseBuilder } from './responseBuilder';

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

    get(path: string) {
        this.predicates.push(new PredicateBuilder({ operator: 'equals', method: 'GET', path }));
        return this;
    }

    response({ status, headers, body, decorate, repeat, copyFromHeader }: IResponseBuilder) {
        this.responses.push(new ResponseBuilder({ status, headers, body, decorate, repeat, copyFromHeader }));
        return this;
    }

    async addStub() {
        await addStub({ stub: this });
        return this;
    }
}
