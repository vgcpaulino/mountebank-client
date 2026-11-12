import { StubBuilder } from '../../../src';

describe('StubBuilder - chaos behavior', () => {
    test('maps friendly names to mountebank fields', () => {
        const stub = new StubBuilder().get('/orders').response({
            status: 200,
            body: { ok: true },
            chaos: { errorRate: 0.1, errorStatus: 503, latencyRate: 0.5, maxLatency: 250 },
        });

        expect(stub.responses[0].behaviors).toEqual([
            {
                chaos: { errorRate: 0.1, errorStatusCode: 503, latencyRate: 0.5, maxLatencyMs: 250 },
            },
        ]);
    });

    test('omits fields that were not set', () => {
        const stub = new StubBuilder().get('/orders').response({ status: 200, chaos: { errorRate: 1 } });

        expect(stub.responses[0].behaviors).toEqual([{ chaos: { errorRate: 1 } }]);
    });

    test('is added after the other behaviors', () => {
        const stub = new StubBuilder().get('/orders').response({
            status: 200,
            wait: 100,
            decorate: '(config) => {}',
            chaos: { errorRate: 0.2 },
        });

        const behaviors = stub.responses[0].behaviors ?? [];
        expect(behaviors[behaviors.length - 1]).toEqual({ chaos: { errorRate: 0.2 } });
    });

    test('works on proxy responses', () => {
        const stub = new StubBuilder()
            .get('/orders')
            .proxyResponse({ url: 'http://localhost:8080', chaos: { latencyRate: 1, maxLatency: 50 } });

        expect(stub.responses[0]).toMatchObject({
            proxy: { to: 'http://localhost:8080' },
            behaviors: [{ chaos: { latencyRate: 1, maxLatencyMs: 50 } }],
        });
    });

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
