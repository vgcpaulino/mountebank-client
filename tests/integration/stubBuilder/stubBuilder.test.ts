import { http } from '../../helpers/http';
import { createClient, ImposterBuilder, StubBuilder } from '../../../src';
import { mountebankUrl, testPort } from '../../config/ports';

const imposterPort = testPort(1112);
const imposter = createClient().imposter(imposterPort);

describe('Stub Builder', () => {
    beforeAll(async () => {
        await createClient().createImposter(new ImposterBuilder({ port: imposterPort, protocol: 'http' }));
    });

    test('Add Stub', async () => {
        const stub = new StubBuilder().get('/example').response({
            status: 200,
            headers: {
                'content-type': '',
            },
            body: '<html><body><h1>Title</h1></body></html>',
        });

        await imposter.addStub(stub);

        const response = await http.get(`${mountebankUrl}/imposters/${imposterPort}`);
        expect(response.status).toBe(200);
        expect(response.data.port).toBe(imposterPort);

        const { stubs } = response.data;
        const stubResponse = stubs[0];
        expect(stubResponse.stubID).not.toBeUndefined();

        await imposter.deleteStub(stub);
        const responseAfterDelete = await http.get(`${mountebankUrl}/imposters/${imposterPort}`);
        expect(responseAfterDelete.status).toBe(200);
        expect(responseAfterDelete.data.stubs.length).toBe(0);
    });
});
