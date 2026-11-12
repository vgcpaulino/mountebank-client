import { RecordedRequest, RequestFilter } from '../interfaces/request';

/**
 * Turns a request as mountebank recorded it into a `RecordedRequest`:
 * - GraphQL: mb-graphql records `{ query: 'getUser', args }` or `{ mutation: 'createUser', args }`. That `query`
 *   would clash with HTTP's query string, so it becomes `operationType` + `operationName`.
 * - Adds `json` (the parsed body) when the body is valid JSON.
 */
export function normalizeRequest(recorded: Record<string, unknown>): RecordedRequest {
    const { query, mutation, ...rest } = recorded;
    const request: Record<string, unknown> = { ...rest };
    if (typeof query === 'string') {
        request.operationType = 'query';
        request.operationName = query;
    } else if (query !== undefined) {
        request.query = query;
    }
    if (typeof mutation === 'string') {
        request.operationType = 'mutation';
        request.operationName = mutation;
    }
    const result = request as RecordedRequest;
    if (typeof result.body === 'string' && result.body !== '') {
        try {
            result.json = JSON.parse(result.body);
        } catch {
            // not JSON: leave json out
        }
    }
    return result;
}

/** Whether `request` satisfies every field set in `filter`. */
export function matchesFilter(request: RecordedRequest, filter: RequestFilter = {}): boolean {
    const { method, path, query, headers, body, operationName, args } = filter;

    if (method !== undefined && (request.method ?? '').toUpperCase() !== method.toUpperCase()) {
        return false;
    }
    if (path !== undefined) {
        const actual = request.path ?? '';
        if (path instanceof RegExp ? !path.test(actual) : actual !== path) {
            return false;
        }
    }
    if (query !== undefined && !containsEntries(request.query ?? {}, query)) {
        return false;
    }
    if (headers !== undefined && !containsEntries(lowerCaseKeys(request.headers ?? {}), lowerCaseKeys(headers))) {
        return false;
    }
    if (body !== undefined) {
        if (typeof body === 'string') {
            if (request.body !== body) {
                return false;
            }
        } else if (!('json' in request) || !containsDeep(request.json, body)) {
            return false;
        }
    }
    if (operationName !== undefined && request.operationName !== operationName) {
        return false;
    }
    if (args !== undefined && !containsDeep(request.args ?? {}, args)) {
        return false;
    }
    return true;
}

function lowerCaseKeys<T>(record: Record<string, T>): Record<string, T> {
    const result: Record<string, T> = {};
    Object.keys(record).forEach((key) => {
        result[key.toLowerCase()] = record[key];
    });
    return result;
}

function containsEntries(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
    return Object.entries(expected).every(([key, value]) => key in actual && containsDeep(actual[key], value));
}

/**
 * `expected` is contained in `actual`: objects may have extra keys, arrays must have the same length with each
 * element contained, and anything else must be strictly equal.
 */
function containsDeep(actual: unknown, expected: unknown): boolean {
    if (Array.isArray(expected)) {
        return (
            Array.isArray(actual) &&
            actual.length === expected.length &&
            expected.every((item, index) => containsDeep(actual[index], item))
        );
    }
    if (expected !== null && typeof expected === 'object') {
        return (
            actual !== null &&
            typeof actual === 'object' &&
            !Array.isArray(actual) &&
            containsEntries(actual as Record<string, unknown>, expected as Record<string, unknown>)
        );
    }
    return actual === expected;
}
