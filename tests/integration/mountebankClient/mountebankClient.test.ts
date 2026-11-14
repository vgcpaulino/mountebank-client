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

    test('createImposter without a port returns the port mountebank picked', async () => {
        const imposter = await mb.createImposter({ protocol: 'http' });

        expect(imposter.port).toEqual(expect.any(Number));
        expect((await imposter.get()).port).toBe(imposter.port);

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

    test('imposter() also takes the ImposterBuilder, and uses its port', async () => {
        const definition = new ImposterBuilder({ port: testPort(1126), protocol: 'http', name: 'by-builder' });
        await mb.createImposter(definition);

        const imposter = mb.imposter(definition);

        expect(imposter.port).toBe(definition.port);
        expect((await imposter.get()).name).toBe('by-builder');
        await imposter.delete();
        expect(() => mb.imposter({})).toThrow('client.imposter() needs a port');
    });

    test('a logger gets a debug message for every call, including ones that fail', async () => {
        const messages: string[] = [];
        const logger = { debug: (message: string) => messages.push(message) };

        await createClient({ url: mountebankUrl, logger }).imposter(testPort(1127)).delete();
        await createClient({ url: `http://localhost:${testPort(1149)}`, logger })
            .getImposters()
            .catch(() => undefined);

        expect(messages).toEqual([
            expect.stringMatching(
                new RegExp(
                    `^mountebank-client: DELETE ${mountebankUrl}/imposters/${testPort(1127)} → 200 \\(\\d+ ms\\)$`
                )
            ),
            expect.stringMatching(/^mountebank-client: GET http:\/\/localhost:\d+\/imposters → failed: ECONNREFUSED/),
        ]);
    });
});
