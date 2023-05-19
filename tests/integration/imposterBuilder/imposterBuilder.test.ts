import axios from 'axios';
import { Imposter, ImposterBuilder, getImposters } from '../../../src';

describe('Imposter Builder', () => {
    test('Add Imposter', async () => {
        const imposter = new ImposterBuilder({ port: 1111, protocol: 'http' });
        await imposter.addImposter();

        const response = await getImposters();
        const { imposters } = response;
        const imposterResult = imposters.find((i: Imposter) => i.protocol === 'http' && imposter.port === 1111);

        expect(imposterResult).not.toBeUndefined();
        expect(imposters[0]).toMatchObject({
            protocol: 'http',
            port: 1111,
        });
    });
});
