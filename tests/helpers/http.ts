/**
 * Minimal fetch-based HTTP client for the tests (replaces axios). Like axios with `validateStatus: null`, it never
 * throws because of the status; it does reject when nothing answers (e.g. ECONNREFUSED).
 */
export interface TestResponse {
    status: number;
    /** JSON-parsed body when it is JSON, otherwise the text ('' when empty). */
    data: any;
}

interface Options {
    headers?: Record<string, string>;
}

async function send(method: string, url: string, body: unknown, { headers = {} }: Options = {}): Promise<TestResponse> {
    const response = await fetch(url, {
        method,
        headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data: unknown = text;
    try {
        data = text === '' ? '' : JSON.parse(text);
    } catch {
        // not JSON: keep the text
    }
    return { status: response.status, data };
}

export const http = {
    get: (url: string, options?: Options) => send('GET', url, undefined, options),
    post: (url: string, body?: unknown, options?: Options) => send('POST', url, body, options),
};
