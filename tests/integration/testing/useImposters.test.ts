import { http } from '../../helpers/http';
import { getImposters, getRequests, ImposterBuilder, StubBuilder, waitForMountebank } from '../../../src';
import { setupMountebank } from '../../../src/server';
import { useImposters } from '../../../src/testing/jest';
import { mountebankUrl, testPort } from '../../config/ports';

const port = testPort(1141);
const api = new ImposterBuilder({ port, protocol: 'http', recordRequests: true })
    .addStub(new StubBuilder().get('/users/1').response({ status: 200, body: { id: 1 } }))
    .addDefaultResponse({ status: 404, body: 'no stub' });

describe('useImposters (Jest)', () => {
    useImposters([api]);

    test('a test can add stubs and make requests', async () => {
        await new StubBuilder({ imposterPort: port }).get('/extra').response({ status: 200, body: 'extra' }).addStub();

        expect((await http.get(`http://localhost:${port}/extra`)).data).toBe('extra');
        expect((await http.get(`http://localhost:${port}/users/1`)).data).toEqual({ id: 1 });
        expect(await getRequests({ imposterPort: port })).toHaveLength(2);
    });

    test('the next test starts from the definition again: no extra stub, no recorded requests', async () => {
        expect(await getRequests({ imposterPort: port })).toEqual([]);

        const extra = await http.get(`http://localhost:${port}/extra`);
        expect(extra.status).toBe(404);
        expect((await http.get(`http://localhost:${port}/users/1`)).data).toEqual({ id: 1 });
    });
});

describe('setupMountebank with an external server', () => {
    test('creates the imposters on it, and stop() deletes them but leaves the server running', async () => {
        const externalPort = testPort(1142);
        const handle = await setupMountebank({
            url: mountebankUrl,
            imposters: [new ImposterBuilder({ port: externalPort, protocol: 'http' })],
        });

        expect(handle.url).toBe(mountebankUrl);
        expect((await getImposters()).map((i) => i.port)).toContain(externalPort);

        await handle.stop();

        expect((await getImposters()).map((i) => i.port)).not.toContain(externalPort);
        await expect(waitForMountebank({ url: mountebankUrl, timeout: 1000 })).resolves.toBeUndefined();
    });
});

describe('waitForMountebank', () => {
    test('fails with a clear message when nothing answers', async () => {
        const deadUrl = `http://localhost:${testPort(1149)}`;

        await expect(waitForMountebank({ url: deadUrl, timeout: 300 })).rejects.toThrow(
            `mountebank at ${deadUrl} did not answer within 300 ms`
        );
    });
});
