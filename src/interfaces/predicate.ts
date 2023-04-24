export interface PredicateEquals {
    method?: string;
    path?: string;
    query?: any | string;
    args?: Record<string, string | number | boolean>;
    mutation?: string;
}

export interface Predicate {
    equals: PredicateEquals;
}
