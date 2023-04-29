import { Imposter, ImposterBuilder, StubBuilder, deleteStubsByID } from '../../../src';

describe('Mountebank Client', () => {
    test('Delete Multiple Stubs', async () => {
        const port = 1113;
        const imposter = await new ImposterBuilder({ port, protocol: 'http' })
            .addStub(new StubBuilder({ imposterPort: port }).get('/example').response({ status: 200 }))
            .addStub(new StubBuilder({ imposterPort: port }).get('/example').response({ status: 200 }))
            .addStub(new StubBuilder({ imposterPort: port }).get('/example').response({ status: 200 }))
            .addImposter();
        const stub1 = new StubBuilder({ imposterPort: port }).get('/example').response({ status: 200 });
        await stub1.addStub();
        const stub2 = new StubBuilder({ imposterPort: port }).get('/example').response({ status: 200 });
        await stub2.addStub();

        const stubIDs = [stub2.stubID, ...(imposter.stubs.map((s) => s.stubID) as string[])];
        let imposterAfterDelete: Imposter | undefined;
        if (stubIDs) {
            imposterAfterDelete = await deleteStubsByID({ imposterPort: port, stubIDs });
        }

        expect(imposterAfterDelete).not.toBeUndefined();
        expect(imposterAfterDelete?.stubs?.length).toBe(1);
        expect(imposterAfterDelete?.stubs?.[0].stubID).toBe(stub1.stubID);
    });
});
