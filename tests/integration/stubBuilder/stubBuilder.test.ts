import axios from 'axios';
import { ImposterBuilder, StubBuilder, getImposter } from '../../../src';

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

        const response = await getImposter({ port: 1112 });

        expect(response.port).toBe(1112);

        const { stubs } = response;
        const stubResponse = stubs[0];
        expect(stubResponse.stubID).not.toBeUndefined();

        await stub.deleteStub();
        const responseAfterDelete = await getImposter({ port: 1112 });
        expect(responseAfterDelete.stubs.length).toBe(0);
    });
});
