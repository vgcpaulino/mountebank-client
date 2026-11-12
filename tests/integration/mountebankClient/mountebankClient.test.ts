import { createClient, ImposterBuilder, StubBuilder } from '../../../src';
import { mountebankUrl, testPort } from '../../config/ports';

const mb = createClient();

describe('Mountebank Client', () => {
    test('createClient defaults to MOUNTEBANK_URL and drops a trailing slash', () => {
        expect(mb.url).toBe(mountebankUrl);
        expect(createClient({ url: 'http://example.test:2525/' }).url).toBe('http://example.test:2525');
    });

    test('createImposter returns a handle to the imposter it created', async () => {
        const port = testPort(1113);
        const imposter = await mb.createImposter(
            new ImposterBuilder({ port, protocol: 'http', name: 'orders' }).addStub(
                new StubBuilder().get('/example').response({ status: 200 })
            )
        );

        expect(imposter.port).toBe(port);
        const details = await imposter.get();
        expect(details).toMatchObject({ port, protocol: 'http', name: 'orders' });
        expect(details.stubs).toHaveLength(1);

        await imposter.delete();
    });

    test('addStubs adds in order, and deleteStub takes a StubBuilder or its ID', async () => {
        const port = testPort(1125);
        const kept = new StubBuilder().get('/example').response({ status: 200 });
        const imposter = await mb.createImposter(new ImposterBuilder({ port, protocol: 'http' }).addStub(kept));
        const first = new StubBuilder().get('/example').response({ status: 200 });
        const second = new StubBuilder().get('/example').response({ status: 200 });

        await imposter.addStubs([first, second]);
        expect((await imposter.get()).stubs?.map((s) => s.stubID)).toEqual([kept.stubID, first.stubID, second.stubID]);

        await imposter.deleteStub(first);
        await imposter.deleteStub(second.stubID);

        expect((await imposter.get()).stubs?.map((s) => s.stubID)).toEqual([kept.stubID]);
        await imposter.delete();
    });
});
