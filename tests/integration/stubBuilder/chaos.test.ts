import axios from 'axios';
import { ImposterBuilder, StubBuilder } from '../../../src';

const imposterPort = 1115;

describe('Stub Builder - chaos and wait behaviors', () => {
    beforeAll(async () => {
        const imposter = new ImposterBuilder({ port: imposterPort, protocol: 'http' });
        await imposter.addImposter();
    });

    test('injects the configured error status when errorRate is 1', async () => {
        const stub = new StubBuilder({ imposterPort })
            .get('/chaos/error')
            .response({ status: 200, body: { ok: true }, chaos: { errorRate: 1, errorStatus: 503 } });
        await stub.addStub();

        const response = await axios.get(`http://localhost:${imposterPort}/chaos/error`, { validateStatus: null });
        expect(response.status).toBe(503);
        expect(response.data).toBe('');

        await stub.deleteStub();
    });

    test('leaves the response alone when the rates are 0', async () => {
        const stub = new StubBuilder({ imposterPort })
            .get('/chaos/none')
            .response({ status: 200, body: { ok: true }, chaos: { errorRate: 0, latencyRate: 0 } });
        await stub.addStub();

        const response = await axios.get(`http://localhost:${imposterPort}/chaos/none`);
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ ok: true });

        await stub.deleteStub();
    });

    test('delays the response when wait is set', async () => {
        const stub = new StubBuilder({ imposterPort }).get('/slow').response({ status: 200, wait: 300 });
        await stub.addStub();

        const start = Date.now();
        const response = await axios.get(`http://localhost:${imposterPort}/slow`);
        expect(response.status).toBe(200);
        expect(Date.now() - start).toBeGreaterThanOrEqual(290);

        await stub.deleteStub();
    });
});
