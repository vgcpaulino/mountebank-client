import axios from 'axios';
import { Imposter, ImposterBuilder } from '../../../src';

describe('Imposter Builder', () => {
    test('Add Imposter', async () => {
        const imposter = new ImposterBuilder({ port: 1111, protocol: 'http' });
        await imposter.addImposter();

        const response = await axios.get('http://localhost:2525/imposters');
        expect(response.status).toBe(200);

        const { imposters } = response.data;
        const imposterResult = imposters.find((i: Imposter) => i.protocol === 'http' && imposter.port === 1111);
        expect(imposterResult).not.toBeUndefined();
        expect(imposters[0]).toMatchObject({
            protocol: 'http',
            port: 1111,
        });
    });
});
