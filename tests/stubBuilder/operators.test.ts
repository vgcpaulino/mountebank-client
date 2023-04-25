import { StubBuilder } from '../../src';
import { OperatorTypes } from '../../src/interfaces/types';

describe('StubBuilder', () => {
    const operators: OperatorTypes[] = ['equals', 'endsWith', 'startsWith'];

    test.each(operators)('GET method with %s operator', (operator) => {
        const options = operator === 'equals' ? undefined : { operator };
        const stub = new StubBuilder().get('/', options).response({ status: 200 });
        const { predicates } = stub;
        expect(predicates.length).toBe(1);
        expect(predicates[0]).toMatchObject({
            [operator]: {
                method: 'GET',
                path: '/',
                query: undefined,
                mutation: undefined,
                args: undefined,
            },
        });
    });

    test.each(operators)('POST method with %s operator', (operator) => {
        const options = operator === 'equals' ? undefined : { operator };
        const stub = new StubBuilder().post('/', options).response({ status: 200 });
        const { predicates } = stub;
        expect(predicates.length).toBe(1);
        expect(predicates[0]).toMatchObject({
            [operator]: {
                method: 'POST',
                path: '/',
                query: undefined,
                mutation: undefined,
                args: undefined,
            },
        });
    });

    test.each(operators)('PATCH method with %s operator', (operator) => {
        const options = operator === 'equals' ? undefined : { operator };
        const stub = new StubBuilder().patch('/', options).response({ status: 200 });
        const { predicates } = stub;
        expect(predicates.length).toBe(1);
        expect(predicates[0]).toMatchObject({
            [operator]: {
                method: 'PATCH',
                path: '/',
                query: undefined,
                mutation: undefined,
                args: undefined,
            },
        });
    });

    test.each(operators)('DELETE method with %s operator', (operator) => {
        const options = operator === 'equals' ? undefined : { operator };
        const stub = new StubBuilder().delete('/', options).response({ status: 200 });
        const { predicates } = stub;
        expect(predicates.length).toBe(1);
        expect(predicates[0]).toMatchObject({
            [operator]: {
                method: 'DELETE',
                path: '/',
                query: undefined,
                mutation: undefined,
                args: undefined,
            },
        });
    });

    test.each(operators)('OPTIONS method with %s operator', (operator) => {
        const options = operator === 'equals' ? undefined : { operator };
        const stub = new StubBuilder().options('/', options).response({ status: 200 });
        const { predicates } = stub;
        expect(predicates.length).toBe(1);
        expect(predicates[0]).toMatchObject({
            [operator]: {
                method: 'OPTIONS',
                path: '/',
                query: undefined,
                mutation: undefined,
                args: undefined,
            },
        });
    });
});
