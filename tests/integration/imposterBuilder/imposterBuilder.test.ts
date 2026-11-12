import axios from 'axios';
import { Imposter, ImposterBuilder } from '../../../src';
import { mountebankUrl, testPort } from '../../config/ports';

const imposterPort = testPort(1111);

describe('Imposter Builder', () => {
    test('Add Imposter', async () => {
        const imposter = new ImposterBuilder({ port: imposterPort, protocol: 'http' });
        await imposter.addImposter();

        const response = await axios.get(`${mountebankUrl}/imposters`);
        expect(response.status).toBe(200);

        const { imposters } = response.data;
        const imposterResult = imposters.find((i: Imposter) => i.protocol === 'http' && i.port === imposterPort);
        expect(imposterResult).not.toBeUndefined();
        expect(imposters[0]).toMatchObject({
            protocol: 'http',
            port: imposterPort,
        });
    });
});
