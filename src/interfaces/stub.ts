import { Predicate } from './predicate';
import { Response } from './response';

export interface Stub {
    predicates?: Predicate[];
    responses?: Response[];
}
