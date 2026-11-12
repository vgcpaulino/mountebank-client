import axios from 'axios';
import { ImposterBuilder, StubBuilder } from '../../../src';
import { mountebankUrl, testPort } from '../../config/ports';

const imposterPort = testPort(1112);

describe('Stub Builder', () => {
    beforeAll(async () => {
        const imposter = new ImposterBuilder({ port: imposterPort, protocol: 'http' });
        await imposter.addImposter();
    });

    test('Add Stub', async () => {
        const stub = new StubBuilder({ imposterPort }).get('/example').response({
            status: 200,
            headers: {
                'content-type': '',
            },
            body: '<html><body><h1>Title</h1></body></html>',
        });

        await stub.addStub();

        const response = await axios.get(`${mountebankUrl}/imposters/${imposterPort}`);
        expect(response.status).toBe(200);
        expect(response.data.port).toBe(imposterPort);

        const { stubs } = response.data;
        const stubResponse = stubs[0];
        expect(stubResponse.stubID).not.toBeUndefined();

        await stub.deleteStub();
        const responseAfterDelete = await axios.get(`${mountebankUrl}/imposters/${imposterPort}`);
        expect(responseAfterDelete.status).toBe(200);
        expect(responseAfterDelete.data.stubs.length).toBe(0);
    });
});
