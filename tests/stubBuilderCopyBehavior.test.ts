import { Config, StubBuilder } from '../src';

describe('StubBuilder', () => {
    test('Copy Behavior', async () => {
        const stub = new StubBuilder().get('/').response({
            status: 200,
            headers: { Origin: '${Origin}' },
            copyFromHeader: { name: 'Origin', into: '${Origin}' },
        });
        const { responses } = stub;

        expect(responses[0].behaviors?.length).toBe(1);
        expect(responses?.[0].behaviors?.[0]).toMatchObject({
            copy: {
                from: { headers: 'Origin' },
                into: '${Origin}',
                using: { method: 'regex', selector: '.+' },
            },
        });
    });
});
