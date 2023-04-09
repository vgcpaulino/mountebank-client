export interface PredicateEquals {
    method?: string;
    path?: string;
}

export interface Predicate {
    equals: PredicateEquals;
}
