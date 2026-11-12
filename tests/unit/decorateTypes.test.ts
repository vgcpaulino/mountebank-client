import { Config, StubBuilder } from '../../src';

// Compile-time checks: this file fails `tsc` if the Config types regress. The functions never run.
describe('Config types', () => {
    test('config.state takes a type argument and is checked against it', () => {
        new StubBuilder().get('/count').response({
            status: 200,
            decorate: (config: Config<{ count?: number }>) => {
                config.state.count = (config.state.count ?? 0) + 1;
                // @ts-expect-error -- not in the declared state
                config.state.other = 1;
                // @ts-expect-error -- count is a number
                config.state.count = 'one';
            },
        });
    });

    test('without a type argument, state accepts any field', () => {
        new StubBuilder().get('/any').response({
            status: 200,
            decorate: (config: Config) => {
                config.state.users ??= {};
                config.response.body = { users: config.state.users };
            },
        });
    });

    test('the request body is a string', () => {
        const parse = (config: Config) => {
            const body: string = config.request.body;
            // @ts-expect-error -- a string has no `id`; JSON.parse it first
            return config.request.body.id ?? body;
        };
        expect(typeof parse).toBe('function');
    });

    test('the builder sends decorate functions as source text', () => {
        const stub = new StubBuilder().get('/x').response({
            status: 200,
            decorate: (config: Config<{ n?: number }>) => {
                config.state.n = 1;
            },
        });

        const decorate = stub.responses[0].behaviors?.find((b) => b.decorate !== undefined)?.decorate;
        expect(typeof decorate).toBe('string');
        expect(decorate).toContain('config.state.n = 1');
    });
});
