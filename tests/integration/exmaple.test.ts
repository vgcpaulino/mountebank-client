import axios from 'axios';
import { ImposterBuilder, StubBuilder } from '../../src';

describe('Add Impoxxxxster', () => {
    test('With xxx', async () => {
        const imposter = new ImposterBuilder({ port: 1111, protocol: 'http' });
        await imposter.addImposter();
        const response = await axios.get('http://localhost:2525/imposters');
        expect(response.status).toBe(200);
        const { imposters } = response.data;
        console.log(JSON.stringify(imposters));
        expect(imposters.length).toBe(1);
        expect(imposters[0]).toMatchObject({
            protocol: 'http',
            port: 1111,
        });
    });
});
