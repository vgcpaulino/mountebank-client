import { Config, StubBuilder } from '../../src';

const decorateFunction = (config: Config) => {
    config.logger.info('LOG!');
};

describe('StubBuilder', () => {
    test('Decorate - Accepts Function', async () => {
        const stubDecorateFunction = new StubBuilder()
            .get('/decorateFunction')
            .response({ status: 200, body: { message: 'Welcome!' }, decorate: decorateFunction });
        const { responses } = stubDecorateFunction;

        expect(responses.length).toBe(1);
        expect(responses[0].behaviors?.length).toBe(1);

        const behavior = responses[0].behaviors?.[0];
        expect(behavior).toMatchObject({ decorate: "(config) => {\n    config.logger.info('LOG!');\n}" });
    });

    test('Decorate - Accepts Function Array', async () => {
        const stubDecorateFunction = new StubBuilder()
            .get('/decorateFunction')
            .response({ status: 200, body: { message: 'Welcome!' }, decorate: [decorateFunction, decorateFunction] });
        const { responses } = stubDecorateFunction;

        expect(responses.length).toBe(1);
        expect(responses[0].behaviors?.length).toBe(2);

        const behavior1 = responses[0].behaviors?.[0];
        expect(behavior1).toMatchObject({ decorate: "(config) => {\n    config.logger.info('LOG!');\n}" });

        const behavior2 = responses[0].behaviors?.[1];
        expect(behavior2).toMatchObject({ decorate: "(config) => {\n    config.logger.info('LOG!');\n}" });
    });

    test('Decorate - Accepts String', async () => {
        const stubDecorateFunction = new StubBuilder().get('/decorateFunction').response({
            status: 200,
            decorate: '(config) => { config.logger.info("Decorate String"); }',
        });
        const { responses } = stubDecorateFunction;

        expect(responses.length).toBe(1);
        expect(responses[0].behaviors?.length).toBe(1);

        const behavior = responses[0].behaviors?.[0];
        expect(behavior?.decorate).toBe('(config) => { config.logger.info("Decorate String"); }');
    });

    test('Decorate - Accepts String Array', async () => {
        const stubDecorateFunction = new StubBuilder().get('/decorateFunction').response({
            status: 200,
            decorate: [
                '(config) => { config.logger.info("Decorate String"); }',
                '(config) => { config.logger.info("Decorate String"); }',
            ],
        });
        const { responses } = stubDecorateFunction;

        expect(responses.length).toBe(1);
        expect(responses[0].behaviors?.length).toBe(2);

        const behavior1 = responses[0].behaviors?.[0];
        expect(behavior1?.decorate).toBe('(config) => { config.logger.info("Decorate String"); }');

        const behavior2 = responses[0].behaviors?.[1];
        expect(behavior2?.decorate).toBe('(config) => { config.logger.info("Decorate String"); }');
    });
});
