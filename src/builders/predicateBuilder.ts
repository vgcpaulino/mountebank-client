import { Predicate, PredicateEquals } from '../interfaces';
import { OperatorTypes, ResponseRecord } from '../interfaces/types';

interface IPredicateBuilder {
    operator: OperatorTypes;
    method?: string;
    path?: string;
    query?: ResponseRecord | string;
    mutation?: string;
    args?: Record<string, string | number | boolean>;
}

export class PredicateBuilder {
    equals!: PredicateEquals;
    endsWith!: PredicateEquals;
    startsWith!: PredicateEquals;

    constructor({ operator, method, path, query, mutation, args }: IPredicateBuilder) {
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
