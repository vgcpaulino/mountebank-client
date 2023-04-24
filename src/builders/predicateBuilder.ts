import { Predicate, PredicateEquals } from '../interfaces';
import { ResponseRecord } from '../interfaces/types';

type operatorTypes = 'equals';

interface IPredicateBuilder {
    operator: operatorTypes;
    method?: string;
    path?: string;
    query?: ResponseRecord | string;
    mutation?: string;
    args?: Record<string, string | number | boolean>;
}

export class PredicateBuilder {
    equals!: PredicateEquals;

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
