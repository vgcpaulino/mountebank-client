import axios from 'axios';
import { deleteImposter, ImposterBuilder, StubBuilder } from '../../../src';
import { mountebankUrl, testPort } from '../../config/ports';

const imposterPort = testPort(1121);

describe("Imposter Builder - stubs use their imposter's port", () => {
    afterAll(async () => {
        await deleteImposter({ port: imposterPort });
    });

    test('a stub added through the imposter can later be deleted without passing imposterPort', async () => {
        const keep = new StubBuilder().get('/keep').response({ status: 200 });
        const remove = new StubBuilder().get('/remove').response({ status: 200 });
        await new ImposterBuilder({ port: imposterPort, protocol: 'http' }).addStubs([keep, remove]).addImposter();

        // Before the fix this went to the default port (7117) and failed.
        await remove.deleteStub();

        const { stubs } = (await axios.get(`${mountebankUrl}/imposters/${imposterPort}`)).data;
        expect(stubs.map((s: { stubID: string }) => s.stubID)).toEqual([keep.stubID]);
    });
});
