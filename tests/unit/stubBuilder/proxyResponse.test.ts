import { StubBuilder } from '../../../src';
import { ProxyModeTypes } from '../../../src/interfaces/types';

describe('StubBuilder', () => {
    test.each(['proxyTransparent', 'proxyAlways', 'proxyOnce'])('Proxy Response with mode %s', (mode) => {
        const stub = new StubBuilder().post('/').proxyResponse({
            url: 'http://localhost:8080',
            proxyMode: mode as ProxyModeTypes,
            decorate: '(config) => { config.logger.info("Decorate String"); }',
        });

        const { responses } = stub;

        expect(responses.length).toBe(1);
        expect(stub.responses[0]).toMatchObject({
            proxy: {
                to: 'http://localhost:8080',
                mode: mode,
            },
            behaviors: [
                {
                    decorate: '(config) => { config.logger.info("Decorate String"); }',
                },
            ],
        });
    });
});
