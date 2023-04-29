import { Predicate } from './predicate';
import { Response } from './response';

interface Self {
    href: string;
}

interface Links {
    self: Self;
}

export interface Stub {
    stubID?: string;
    predicates?: Predicate[];
    responses?: Response[];
    _links?: Links;
}
