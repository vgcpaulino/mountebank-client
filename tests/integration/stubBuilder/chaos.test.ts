import axios from 'axios';
import { ImposterBuilder, StubBuilder } from '../../../src';
import { testPort } from '../../config/ports';

const imposterPort = testPort(1115);

// The chaos behavior exists from mountebank 2.9.6 on; older servers reject it as "Unrecognized behavior".
// These tests switch themselves on once the installed mountebank supports it.
const { version: mountebankVersion } = require('@mbtest/mountebank/package.json');
const [major, minor, patch] = mountebankVersion.split(/[.-]/).map(Number);
const supportsChaos = major > 2 || (major === 2 && (minor > 9 || (minor === 9 && patch >= 6)));
const testChaos = supportsChaos ? test : test.skip;

describe('Stub Builder - chaos and wait behaviors', () => {
    beforeAll(async () => {
        const imposter = new ImposterBuilder({ port: imposterPort, protocol: 'http' });
        await imposter.addImposter();
    });

    testChaos('injects the configured error status when errorRate is 1', async () => {
        const stub = new StubBuilder({ imposterPort })
            .get('/chaos/error')
            .response({ status: 200, body: { ok: true }, chaos: { errorRate: 1, errorStatus: 503 } });
        await stub.addStub();

        const response = await axios.get(`http://localhost:${imposterPort}/chaos/error`, { validateStatus: null });
        expect(response.status).toBe(503);
        expect(response.data).toBe('');

        await stub.deleteStub();
    });

    testChaos('leaves the response alone when the rates are 0', async () => {
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
