import { ResponseRecord } from './types';

export interface PredicateEquals {
    method?: string;
    path?: string;
    query?: ResponseRecord | string;
    args?: Record<string, string | number | boolean>;
    mutation?: string;
}

export interface Predicate {
    equals: PredicateEquals;
}
