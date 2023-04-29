import axios from 'axios';
import { ImposterBuilder, StubBuilder } from '../../../src';

describe('Stub Builder', () => {
    beforeAll(async () => {
        const imposter = new ImposterBuilder({ port: 1112, protocol: 'http' });
        await imposter.addImposter();
    });

    test('Add Stub', async () => {
        const stub = new StubBuilder({ imposterPort: 1112 }).get('/example').response({
            status: 200,
            headers: {
                'content-type': '',
            },
            body: '<html><body><h1>Title</h1></body></html>',
        });

        await stub.addStub();

        const response = await axios.get('http://localhost:2525/imposters/1112');
        expect(response.status).toBe(200);
        expect(response.data.port).toBe(1112);

        const { stubs } = response.data;
        const stubResponse = stubs[0];
        expect(stubResponse.stubID).not.toBeUndefined();

        await stub.deleteStub();
        const responseAfterDelete = await axios.get('http://localhost:2525/imposters/1112');
        expect(responseAfterDelete.status).toBe(200);
        expect(responseAfterDelete.data.stubs.length).toBe(0);
    });
});
