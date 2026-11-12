import { http } from '../../helpers/http';
import { addStub, deleteImposter, getImposters, ImposterBuilder, MountebankError, StubBuilder } from '../../../src';
import { mountebankUrl, testPort } from '../../config/ports';

const imposterPort = testPort(1118);
const missingPort = testPort(1119);

describe('Mountebank Client - errors', () => {
    beforeAll(async () => {
        await new ImposterBuilder({ port: imposterPort, protocol: 'http' }).addImposter();
    });

    test('creating an imposter on a port that is in use throws instead of being ignored', async () => {
        const again = new ImposterBuilder({ port: imposterPort, protocol: 'http' });

        await expect(again.addImposter()).rejects.toBeInstanceOf(MountebankError);
        await expect(again.addImposter()).rejects.toMatchObject({
            operation: 'ADD_IMPOSTER',
            status: 400,
            message: expect.stringContaining(`port ${imposterPort} is already in use`),
        });
    });

    test('deleteImposter frees the port so the imposter can be recreated', async () => {
        const port = testPort(1120);
        await new ImposterBuilder({ port, protocol: 'http' }).addImposter();

        await deleteImposter({ port });
        await new ImposterBuilder({ port, protocol: 'http' }).addImposter();

        const response = await http.get(`${mountebankUrl}/imposters/${port}`);
        expect(response.status).toBe(200);
        await deleteImposter({ port });
    });

    test('deleteImposter does nothing when there is no imposter', async () => {
        await expect(deleteImposter({ port: missingPort })).resolves.toBeUndefined();
    });

    test('deleting a stub twice throws a clear error instead of a TypeError', async () => {
        const stub = new StubBuilder({ imposterPort }).get('/once').response({ status: 200 });
        await stub.addStub();
        await stub.deleteStub();

        await expect(stub.deleteStub()).rejects.toMatchObject({
            name: 'MountebankError',
            operation: 'DELETE_STUB',
            message: expect.stringContaining(`no stub with ID ${stub.stubID} on the imposter at port ${imposterPort}`),
        });
    });

    test("adding a stub to an imposter that doesn't exist reports mountebank's error", async () => {
        const stub = new StubBuilder().get('/nowhere').response({ status: 200 });

        await expect(addStub({ imposterPort: missingPort, stub })).rejects.toMatchObject({
            name: 'MountebankError',
            operation: 'ADD_STUB',
            status: 404,
        });
    });

    test('a server that does not answer gives a clear MountebankError, not a bare network error', async () => {
        const providerUrl = `http://localhost:${testPort(1149)}`;

        await expect(getImposters({ providerUrl })).rejects.toMatchObject({
            name: 'MountebankError',
            operation: 'GET_IMPOSTERS',
            message: `Listing the imposters failed: can't reach mountebank at ${providerUrl} (ECONNREFUSED)`,
        });
    });
});
