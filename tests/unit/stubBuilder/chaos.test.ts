import { Chaos, StubBuilder } from '../../../src';

interface DecorateResponse {
    statusCode?: number;
    body?: unknown;
}

/** Runs a generated chaos `decorate` the way mountebank does: `(fn)(config)`, then resolves the result. */
async function runDecorate(source: string, response: DecorateResponse) {
    const fn = eval(`(${source})`);
    const result = fn({ response });
    return Promise.resolve(result ?? response);
}

function decorateFor(chaos: Chaos, status = 200): string {
    const stub = new StubBuilder().get('/orders').response({ status, body: { ok: true }, chaos });
    const behaviors = stub.responses[0].behaviors ?? [];
    const { decorate } = behaviors[behaviors.length - 1];
    if (decorate === undefined) {
        throw new Error("the last behavior isn't a decorate");
    }
    return decorate;
}

describe('StubBuilder - chaos, native implementation (mountebank 2.9.6+)', () => {
    test('maps friendly names to mountebank fields', () => {
        const stub = new StubBuilder().get('/orders').response({
            status: 200,
            body: { ok: true },
            chaos: { errorRate: 0.1, errorStatus: 503, latencyRate: 0.5, maxLatency: 250, implementation: 'native' },
        });

        expect(stub.responses[0].behaviors).toEqual([
            {
                chaos: { errorRate: 0.1, errorStatusCode: 503, latencyRate: 0.5, maxLatencyMs: 250 },
            },
        ]);
    });

    test('omits fields that were not set', () => {
        const stub = new StubBuilder()
            .get('/orders')
            .response({ status: 200, chaos: { errorRate: 1, implementation: 'native' } });

        expect(stub.responses[0].behaviors).toEqual([{ chaos: { errorRate: 1 } }]);
    });

    test('is added after the other behaviors', () => {
        const stub = new StubBuilder().get('/orders').response({
            status: 200,
            wait: 100,
            decorate: '(config) => {}',
            chaos: { errorRate: 0.2, implementation: 'native' },
        });

        const behaviors = stub.responses[0].behaviors ?? [];
        expect(behaviors[behaviors.length - 1]).toEqual({ chaos: { errorRate: 0.2 } });
    });
});

describe('StubBuilder - chaos, injection implementation (default, any mountebank)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    test('is the default and is added as the last decorate behavior', () => {
        const stub = new StubBuilder().get('/orders').response({
            status: 200,
            decorate: '(config) => {}',
            chaos: { errorRate: 0.2 },
        });

        const behaviors = stub.responses[0].behaviors ?? [];
        expect(behaviors).toHaveLength(2);
        expect(behaviors[0]).toEqual({ decorate: '(config) => {}' });
        expect(typeof behaviors[1].decorate).toBe('string');
        expect(behaviors[1].chaos).toBeUndefined();
    });

    test('replaces the response with the error status and an empty body when the error triggers', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.05);
        const response = await runDecorate(decorateFor({ errorRate: 0.1, errorStatus: 503 }), {
            statusCode: 200,
            body: { ok: true },
        });

        expect(response).toEqual({ statusCode: 503, body: '' });
    });

    test('defaults the error status to 500', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        const response = await runDecorate(decorateFor({ errorRate: 1 }), { statusCode: 200, body: 'ok' });

        expect(response.statusCode).toBe(500);
    });

    test('leaves the response alone when nothing triggers', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.99);
        const response = await runDecorate(decorateFor({ errorRate: 0.5, latencyRate: 0.5 }), {
            statusCode: 200,
            body: { ok: true },
        });

        expect(response).toEqual({ statusCode: 200, body: { ok: true } });
    });

    test('never triggers when the rates are 0', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        const response = await runDecorate(decorateFor({}), { statusCode: 200, body: 'ok' });

        expect(response).toEqual({ statusCode: 200, body: 'ok' });
    });

    test('delays by a random amount up to maxLatency, then applies the error', async () => {
        jest.useFakeTimers();
        // 1st random: latency triggers; 2nd: delay = floor(0.5 * 400) = 200ms; 3rd: error triggers.
        jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValueOnce(0);
        const source = decorateFor({ latencyRate: 1, maxLatency: 400, errorRate: 1, errorStatus: 504 });

        let settled: DecorateResponse | undefined;
        runDecorate(source, { statusCode: 200, body: 'ok' }).then((r) => (settled = r));

        await jest.advanceTimersByTimeAsync(199);
        expect(settled).toBeUndefined();
        await jest.advanceTimersByTimeAsync(1);
        expect(settled).toEqual({ statusCode: 504, body: '' });
    });

    test('uses no outside variables, so it runs inside mountebank', () => {
        const source = decorateFor({ errorRate: 0.3, errorStatus: 502, latencyRate: 0.4, maxLatency: 900 });

        expect(source).toContain('errorRate = 0.3, errorStatus = 502, latencyRate = 0.4, maxLatency = 900');
        // Only globals mountebank's eval has: Math, setTimeout, Promise. Compiling the source the way mountebank
        // does (eval) is the point of this test.
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        expect(() => new Function(`return ${source}`)).not.toThrow();
    });

    test('rejects an unknown implementation', () => {
        expect(() =>
            new StubBuilder()
                .get('/orders')
                .response({ status: 200, chaos: { errorRate: 1, implementation: 'magic' as never } })
        ).toThrow("chaos.implementation must be 'injection' or 'native'");
    });
});

describe('StubBuilder - chaos on proxy responses', () => {
    test('defaults to proxyTransparent, so nothing chaotic gets recorded', () => {
        const stub = new StubBuilder()
            .get('/orders')
            .proxyResponse({ url: 'http://localhost:8080', chaos: { latencyRate: 1, maxLatency: 50 } });

        expect(stub.responses[0]).toMatchObject({ proxy: { to: 'http://localhost:8080', mode: 'proxyTransparent' } });
        expect(typeof stub.responses[0].behaviors?.[0].decorate).toBe('string');
    });

    test('keeps an explicit proxyAlways', () => {
        const stub = new StubBuilder()
            .get('/orders')
            .proxyResponse({ url: 'http://localhost:8080', proxyMode: 'proxyAlways', chaos: { errorRate: 0.1 } });

        expect(stub.responses[0].proxy?.mode).toBe('proxyAlways');
    });

    test('keeps the old default (proxyAlways) when there is no chaos', () => {
        const stub = new StubBuilder().get('/orders').proxyResponse({ url: 'http://localhost:8080' });

        expect(stub.responses[0].proxy?.mode).toBe('proxyAlways');
    });

    test('rejects proxyOnce, which would record one chaos outcome and replay it forever', () => {
        expect(() =>
            new StubBuilder()
                .get('/orders')
                .proxyResponse({ url: 'http://localhost:8080', proxyMode: 'proxyOnce', chaos: { errorRate: 0.1 } })
        ).toThrow("chaos can't be used with proxyMode 'proxyOnce'");
    });

    test('supports the native implementation too', () => {
        const stub = new StubBuilder().get('/orders').proxyResponse({
            url: 'http://localhost:8080',
            chaos: { latencyRate: 1, maxLatency: 50, implementation: 'native' },
        });

        expect(stub.responses[0].behaviors).toEqual([{ chaos: { latencyRate: 1, maxLatencyMs: 50 } }]);
    });
});

describe('StubBuilder - chaos validation', () => {
    test.each([
        [{ errorRate: 1.5 }, 'chaos.errorRate must be a number between 0 and 1'],
        [{ errorRate: -0.1 }, 'chaos.errorRate must be a number between 0 and 1'],
        [{ latencyRate: 2 }, 'chaos.latencyRate must be a number between 0 and 1'],
        [{ errorStatus: 500.5 }, 'chaos.errorStatus must be a non-negative integer'],
        [{ maxLatency: -1 }, 'chaos.maxLatency must be a non-negative integer'],
    ])('rejects invalid config %o', (chaos, message) => {
        expect(() => new StubBuilder().get('/orders').response({ status: 200, chaos })).toThrow(message);
    });
});

describe('StubBuilder - wait behavior', () => {
    test('forwards wait to the response', () => {
        const stub = new StubBuilder().get('/slow').response({ status: 200, wait: 300 });

        expect(stub.responses[0].behaviors).toEqual([{ wait: 300 }]);
    });
});
