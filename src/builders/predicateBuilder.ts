import { Operator, HttpMethod, ResponseRecord } from '../interfaces/types';
import { Predicate, PredicateEquals } from '../interfaces';

interface PredicateOptions {
    operator: Operator;
    method?: HttpMethod;
    path?: string;
    query?: ResponseRecord | string;
    mutation?: string;
    args?: Record<string, string | number | boolean>;
}

export class PredicateBuilder {
    equals!: PredicateEquals;
    endsWith!: PredicateEquals;
    startsWith!: PredicateEquals;
    contains!: PredicateEquals;
    matches!: PredicateEquals;

    constructor({ operator, method, path, query, mutation, args }: PredicateOptions) {
        this[operator] = {
            method,
            path,
            query,
            mutation,
            args,
        };
    }

    generate(): Predicate {
        return this;
    }
}
