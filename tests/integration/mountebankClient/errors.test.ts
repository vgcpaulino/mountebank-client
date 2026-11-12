import { http } from '../../helpers/http';
import { createClient, ImposterBuilder, MountebankError, StubBuilder } from '../../../src';
import { mountebankUrl, testPort } from '../../config/ports';

const imposterPort = testPort(1118);
const missingPort = testPort(1119);
const mb = createClient();

describe('Mountebank Client - errors', () => {
    beforeAll(async () => {
        await mb.createImposter(new ImposterBuilder({ port: imposterPort, protocol: 'http' }));
    });

    test('creating an imposter on a port that is in use throws instead of being ignored', async () => {
        const again = new ImposterBuilder({ port: imposterPort, protocol: 'http' });

        await expect(mb.createImposter(again)).rejects.toBeInstanceOf(MountebankError);
        await expect(mb.createImposter(again)).rejects.toMatchObject({
            operation: 'ADD_IMPOSTER',
            status: 400,
            message: expect.stringContaining(`port ${imposterPort} is already in use`),
        });
    });

    test('delete() frees the port so the imposter can be recreated', async () => {
        const port = testPort(1120);
        const imposter = await mb.createImposter(new ImposterBuilder({ port, protocol: 'http' }));

        await imposter.delete();
        await mb.createImposter(new ImposterBuilder({ port, protocol: 'http' }));

        const response = await http.get(`${mountebankUrl}/imposters/${port}`);
        expect(response.status).toBe(200);
        await imposter.delete();
    });

    test('delete() does nothing when there is no imposter', async () => {
        await expect(mb.imposter(missingPort).delete()).resolves.toBeUndefined();
    });

    test('deleting a stub twice throws a clear error instead of a TypeError', async () => {
        const imposter = mb.imposter(imposterPort);
        const stub = new StubBuilder().get('/once').response({ status: 200 });
        await imposter.addStub(stub);
        await imposter.deleteStub(stub);

        await expect(imposter.deleteStub(stub)).rejects.toMatchObject({
            name: 'MountebankError',
            operation: 'DELETE_STUB',
            message: expect.stringContaining(`no stub with ID ${stub.stubID} on the imposter at port ${imposterPort}`),
        });
    });

    test("adding a stub to an imposter that doesn't exist reports mountebank's error", async () => {
        const stub = new StubBuilder().get('/nowhere').response({ status: 200 });

        await expect(mb.imposter(missingPort).addStub(stub)).rejects.toMatchObject({
            name: 'MountebankError',
            operation: 'ADD_STUB',
            status: 404,
        });
    });

    test('a server that does not answer gives a clear MountebankError, not a bare network error', async () => {
        const url = `http://localhost:${testPort(1149)}`;

        await expect(createClient({ url }).getImposters()).rejects.toMatchObject({
            name: 'MountebankError',
            operation: 'GET_IMPOSTERS',
            message: `Listing the imposters failed: can't reach mountebank at ${url} (ECONNREFUSED)`,
        });
    });
});
