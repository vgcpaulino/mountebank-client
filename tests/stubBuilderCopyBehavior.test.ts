import { Config, StubBuilder } from '../src';

describe('StubBuilder - Copy Behavior', () => {
    test('From Header', () => {
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

    test('From Path', () => {
        const stub = new StubBuilder().get('/users/100').response({
            status: 200,
            body: { id: '${userId}' },
            copyFromPath: { into: '${userId}', using: { method: 'regex', selector: '\\d+' } },
        });
        const { responses } = stub;

        expect(responses[0].behaviors?.length).toBe(1);
        expect(responses?.[0].behaviors?.[0]).toMatchObject({
            copy: {
                from: 'path',
                into: '${userId}',
                using: { method: 'regex', selector: '\\d+' },
            },
        });
    });
});
