import { StubBuilder } from '../../src';

describe('StubBuilder', () => {
    test('Operator GET equals', () => {
        const stub = new StubBuilder().get('/').response({ status: 200 });

        const { predicates } = stub;
        expect(predicates.length).toBe(1);
        expect(predicates[0]).toMatchObject({
            equals: {
                method: 'GET',
                path: '/',
                query: undefined,
                mutation: undefined,
                args: undefined,
            },
        });
    });

    test('Operator GET endsWtih', () => {
        const stub = new StubBuilder().get('/', { operator: 'endsWith' }).response({ status: 200 });

        const { predicates } = stub;
        expect(predicates.length).toBe(1);
        expect(predicates[0]).toMatchObject({
            endsWith: {
                method: 'GET',
                path: '/',
                query: undefined,
                mutation: undefined,
                args: undefined,
            },
        });
    });

    test('Operator GET startsWith', () => {
        const stub = new StubBuilder().get('/', { operator: 'startsWith' }).response({ status: 200 });

        const { predicates } = stub;
        expect(predicates.length).toBe(1);
        expect(predicates[0]).toMatchObject({
            startsWith: {
                method: 'GET',
                path: '/',
                query: undefined,
                mutation: undefined,
                args: undefined,
            },
        });
    });
});
