import axios, { AxiosResponse } from 'axios';
import { Config, ImposterBuilder, StubBuilder } from '../../../src';
import { randomUUID } from 'crypto';

const imposterPort = 1114;

describe('Stub Builder', () => {
    beforeAll(async () => {
        const imposter = new ImposterBuilder({ port: imposterPort, protocol: 'http' });
        await imposter.addImposter();
    });

    test('Add Stub', async () => {
        const stub = new StubBuilder({ imposterPort })
            .get('/users/[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?/details', { operator: 'matches' })
            .response({
                status: 200,
                body: {
                    id: '${userId}',
                    name: 'John Doe',
                },
                decorate: (config: Config) => {
                    const requestPath = config.request.path;
                    const guidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
                    const result = requestPath.match(guidPattern);
                    if (result && result.length > 0) {
                        config.response.body = {
                            ...config.response.body,
                            id: result[0],
                        };
                        return config.response;
                    }
                },
            });
        await stub.addStub();

        const guid = randomUUID();
        let response: AxiosResponse;
        response = await axios.get(`http://localhost:${imposterPort}/users/${guid}/details`);
        expect(response.status).toBe(200);
        expect(response.data.id).toBe(guid);

        response = await axios.get(`http://localhost:${imposterPort}/users/${guid}/`);
        expect(response.data.id).not.toBe(guid);
    });
});
