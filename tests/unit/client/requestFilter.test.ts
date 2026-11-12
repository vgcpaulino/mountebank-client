import { matchesFilter, normalizeRequest } from '../../../src/client/requestFilter';
import { RecordedRequest } from '../../../src';

const post: RecordedRequest = normalizeRequest({
    method: 'POST',
    path: '/orders/42',
    query: { page: '2', tag: ['a', 'b'] },
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'abc' },
    body: JSON.stringify({ item: 'book', quantity: 2, customer: { id: 7, name: 'Ada' } }),
});

const graphql: RecordedRequest = {
    operationType: 'query',
    operationName: 'getUser',
    args: { id: 10, filter: { active: true } },
    headers: {},
};

describe('normalizeRequest', () => {
    test('turns mb-graphql operations into operationType and operationName', () => {
        expect(normalizeRequest({ query: 'getUser', args: { id: 10 }, headers: {} })).toEqual({
            operationType: 'query',
            operationName: 'getUser',
            args: { id: 10 },
            headers: {},
        });
        expect(normalizeRequest({ mutation: 'createUser', args: { name: 'Ada' } })).toMatchObject({
            operationType: 'mutation',
            operationName: 'createUser',
        });
    });

    test("keeps an HTTP request's query-string object as query", () => {
        expect(normalizeRequest({ method: 'GET', path: '/', query: { page: '2' } }).query).toEqual({ page: '2' });
    });

    test('adds the parsed body as json', () => {
        expect(post.json).toEqual({ item: 'book', quantity: 2, customer: { id: 7, name: 'Ada' } });
    });

    test('leaves non-JSON and empty bodies alone', () => {
        expect(normalizeRequest({ body: 'plain text' })).not.toHaveProperty('json');
        expect(normalizeRequest({ body: '' })).not.toHaveProperty('json');
        expect(normalizeRequest({})).not.toHaveProperty('json');
    });
});

describe('matchesFilter', () => {
    test('an empty or missing filter matches everything', () => {
        expect(matchesFilter(post)).toBe(true);
        expect(matchesFilter(post, {})).toBe(true);
    });

    test('method is case-insensitive', () => {
        expect(matchesFilter(post, { method: 'post' })).toBe(true);
        expect(matchesFilter(post, { method: 'GET' })).toBe(false);
    });

    test('path matches exactly, or by regular expression', () => {
        expect(matchesFilter(post, { path: '/orders/42' })).toBe(true);
        expect(matchesFilter(post, { path: '/orders' })).toBe(false);
        expect(matchesFilter(post, { path: /^\/orders\/\d+$/ })).toBe(true);
    });

    test('query matches the given entries, including repeated keys', () => {
        expect(matchesFilter(post, { query: { page: '2' } })).toBe(true);
        expect(matchesFilter(post, { query: { tag: ['a', 'b'] } })).toBe(true);
        expect(matchesFilter(post, { query: { page: '3' } })).toBe(false);
        expect(matchesFilter(post, { query: { missing: '1' } })).toBe(false);
    });

    test('header names are case-insensitive', () => {
        expect(matchesFilter(post, { headers: { 'x-request-id': 'abc' } })).toBe(true);
        expect(matchesFilter(post, { headers: { 'X-REQUEST-ID': 'xyz' } })).toBe(false);
    });

    test('a string body matches the raw body exactly', () => {
        expect(matchesFilter(post, { body: post.body })).toBe(true);
        expect(matchesFilter(post, { body: '{"item":"book"}' })).toBe(false);
    });

    test('an object body matches a JSON body that contains it, at any depth', () => {
        expect(matchesFilter(post, { body: { item: 'book' } })).toBe(true);
        expect(matchesFilter(post, { body: { customer: { id: 7 } } })).toBe(true);
        expect(matchesFilter(post, { body: { quantity: 3 } })).toBe(false);
        expect(matchesFilter(normalizeRequest({ body: 'not json' }), { body: { item: 'book' } })).toBe(false);
    });

    test('arrays must match in length, element by element', () => {
        const withList = normalizeRequest({ body: JSON.stringify({ items: [{ id: 1, n: 'a' }, { id: 2 }] }) });

        expect(matchesFilter(withList, { body: { items: [{ id: 1 }, { id: 2 }] } })).toBe(true);
        expect(matchesFilter(withList, { body: { items: [{ id: 1 }] } })).toBe(false);
    });

    test('every field set must match', () => {
        expect(matchesFilter(post, { method: 'POST', path: '/orders/42', body: { item: 'book' } })).toBe(true);
        expect(matchesFilter(post, { method: 'POST', path: '/other' })).toBe(false);
    });

    test('GraphQL: operationName and args', () => {
        expect(matchesFilter(graphql, { operationName: 'getUser' })).toBe(true);
        expect(matchesFilter(graphql, { operationName: 'getUser', args: { id: 10 } })).toBe(true);
        expect(matchesFilter(graphql, { args: { filter: { active: true } } })).toBe(true);
        expect(matchesFilter(graphql, { args: { id: 11 } })).toBe(false);
        expect(matchesFilter(graphql, { method: 'POST' })).toBe(false);
    });
});
