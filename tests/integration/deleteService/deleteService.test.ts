import axios from 'axios';
import { ImposterBuilder, StubBuilder } from '../../../src/builders';
import { Stub } from '../../../src/interfaces';
import { shuffleArray } from '../../helpers/dataTransformer';

describe('Delete Service', () => {
    test('Delete Service', async () => {
        const imposterPort = 8080;

        const stubs: StubBuilder[] = Array.from({ length: 1000 }, () =>
            new StubBuilder({ imposterPort }).get('/example').response({ status: 200 })
        );
        const stubIDs: string[] = shuffleArray(stubs.map((s) => s.stubID));
        await new ImposterBuilder({ port: imposterPort, protocol: 'http' }).addStubs(stubs).addImposter();

        await axios.post('http://localhost:2526/stubs', JSON.stringify({ imposterPort, stubs: stubIDs }), {
            headers: { 'Content-Type': 'application/json' },
        });

        const a = 1;
    });
});
