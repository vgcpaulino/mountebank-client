import { readFileSync } from 'fs';
import { http } from '../../helpers/http';
import { ImposterBuilder, StubBuilder } from '../../../src';
import { testPort } from '../../config/ports';

const imposterPort = testPort(1115);
const backendPort = testPort(1116);
const proxyPort = testPort(1117);

// mountebank's native chaos behavior exists from 2.9.6 on; older servers reject it as "Unrecognized behavior".
// The native tests switch themselves on once the installed mountebank supports it. The default (injection)
// implementation works on any version.
const { version: mountebankVersion } = JSON.parse(
    readFileSync(require.resolve('@mbtest/mountebank/package.json'), 'utf8')
) as { version: string };
const [major, minor, patch] = mountebankVersion.split(/[.-]/).map(Number);
const supportsNativeChaos = major > 2 || (major === 2 && (minor > 9 || (minor === 9 && patch >= 6)));
const testNativeChaos = supportsNativeChaos ? test : test.skip;

const get = (port: number, path: string) => http.get(`http://localhost:${port}${path}`);

describe('Stub Builder - chaos and wait behaviors', () => {
    beforeAll(async () => {
        await new ImposterBuilder({ port: imposterPort, protocol: 'http' }).addImposter();
    });

    test('injects the configured error status when errorRate is 1 (injection, default)', async () => {
        const stub = new StubBuilder({ imposterPort })
            .get('/chaos/error')
            .response({ status: 200, body: { ok: true }, chaos: { errorRate: 1, errorStatus: 503 } });
        await stub.addStub();

        const response = await get(imposterPort, '/chaos/error');
        expect(response.status).toBe(503);
        expect(response.data).toBe('');

        await stub.deleteStub();
    });

    test('leaves the response alone when the rates are 0 (injection, default)', async () => {
        const stub = new StubBuilder({ imposterPort })
            .get('/chaos/none')
            .response({ status: 200, body: { ok: true }, chaos: { errorRate: 0, latencyRate: 0 } });
        await stub.addStub();

        const response = await get(imposterPort, '/chaos/none');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ ok: true });

        await stub.deleteStub();
    });

    test('adds latency without going over maxLatency (injection, default)', async () => {
        const stub = new StubBuilder({ imposterPort })
            .get('/chaos/latency')
            .response({ status: 200, body: 'late', chaos: { latencyRate: 1, maxLatency: 300 } });
        await stub.addStub();

        for (let i = 0; i < 3; i++) {
            const start = Date.now();
            const response = await get(imposterPort, '/chaos/latency');
            expect(response.status).toBe(200);
            expect(response.data).toBe('late');
            expect(Date.now() - start).toBeLessThan(300 + 250); // max delay plus generous overhead
        }

        await stub.deleteStub();
    });

    testNativeChaos('injects the configured error status when errorRate is 1 (native)', async () => {
        const stub = new StubBuilder({ imposterPort }).get('/chaos/native-error').response({
            status: 200,
            body: { ok: true },
            chaos: { errorRate: 1, errorStatus: 503, implementation: 'native' },
        });
        await stub.addStub();

        const response = await get(imposterPort, '/chaos/native-error');
        expect(response.status).toBe(503);
        expect(response.data).toBe('');

        await stub.deleteStub();
    });

    testNativeChaos('leaves the response alone when the rates are 0 (native)', async () => {
        const stub = new StubBuilder({ imposterPort }).get('/chaos/native-none').response({
            status: 200,
            body: { ok: true },
            chaos: { errorRate: 0, latencyRate: 0, implementation: 'native' },
        });
        await stub.addStub();

        const response = await get(imposterPort, '/chaos/native-none');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ ok: true });

        await stub.deleteStub();
    });

    test('delays the response when wait is set', async () => {
        const stub = new StubBuilder({ imposterPort }).get('/slow').response({ status: 200, wait: 300 });
        await stub.addStub();

        const start = Date.now();
        const response = await get(imposterPort, '/slow');
        expect(response.status).toBe(200);
        expect(Date.now() - start).toBeGreaterThanOrEqual(290);

        await stub.deleteStub();
    });
});

describe('Stub Builder - chaos on a proxy', () => {
    beforeAll(async () => {
        // The "real" backend the proxy forwards to.
        await new ImposterBuilder({ port: backendPort, protocol: 'http' })
            .addStub(
                new StubBuilder()
                    .get('/orders', { operator: 'startsWith' })
                    .response({ status: 200, body: { from: 'backend' } })
            )
            .addImposter();
        await new ImposterBuilder({ port: proxyPort, protocol: 'http' }).addImposter();
    });

    test('injects errors into proxied responses, and records nothing', async () => {
        const stub = new StubBuilder({ imposterPort: proxyPort })
            .get('/orders/fail', { operator: 'startsWith' })
            .proxyResponse({ url: `http://localhost:${backendPort}`, chaos: { errorRate: 1, errorStatus: 502 } });
        await stub.addStub();

        for (let i = 0; i < 2; i++) {
            const response = await get(proxyPort, '/orders/fail');
            expect(response.status).toBe(502);
            expect(response.data).toBe('');
        }

        // proxyTransparent (the default with chaos) records no stubs: only ours is on the imposter.
        const imposter = (await http.get(`${process.env.MOUNTEBANK_URL}/imposters/${proxyPort}`)).data;
        expect(imposter.stubs).toHaveLength(1);

        await stub.deleteStub();
    });

    test('passes the backend response through when chaos does not trigger, and adds latency', async () => {
        const stub = new StubBuilder({ imposterPort: proxyPort })
            .get('/orders/slow', { operator: 'startsWith' })
            .proxyResponse({
                url: `http://localhost:${backendPort}`,
                chaos: { errorRate: 0, latencyRate: 1, maxLatency: 300 },
            });
        await stub.addStub();

        const start = Date.now();
        const response = await get(proxyPort, '/orders/slow');
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ from: 'backend' });
        expect(Date.now() - start).toBeLessThan(300 + 250);

        await stub.deleteStub();
    });
});
