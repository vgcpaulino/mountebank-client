import { Predicate, PredicateEquals } from '../interfaces';

type operatorTypes = 'equals';

interface IPredicateBuilder {
    operator: operatorTypes;
    method?: string;
    path?: string;
}

export class PredicateBuilder {
    equals!: PredicateEquals;

    constructor({ operator, method, path }: IPredicateBuilder) {
        this[operator] = {
            method,
            path,
        };
    }

    generate(): Predicate {
        return this;
    }
}
