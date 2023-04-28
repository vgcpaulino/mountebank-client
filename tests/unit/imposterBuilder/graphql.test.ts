import { IImposterBuilder, ImposterBuilder } from '../../../src';
import { graphQLSchema } from '../../../src/helpers/graphqlSchema';

describe('ImposterBuilder', () => {
    test('With GraphQL Schema', () => {
        const config: IImposterBuilder = {
            port: 8080,
            protocol: 'graphql',
            name: 'GraphQL',
            schema: graphQLSchema,
        };
        const imposter = new ImposterBuilder(config);

        expect(imposter.port).toBe(config.port);
        expect(imposter.name).toBe(config.name);
        expect(imposter.protocol).toBe(config.protocol);
        expect(imposter.schema).toBe(graphQLSchema);
    });
});
