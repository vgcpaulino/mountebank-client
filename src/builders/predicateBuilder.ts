import { OperatorTypes, RequestMethodsTypes, ResponseRecord } from '../interfaces/types';
import { Predicate, PredicateEquals } from '../interfaces';

interface IPredicateBuilder {
    operator: OperatorTypes;
    method?: RequestMethodsTypes;
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
