import { StubBuilder } from '../../../src';

describe('StubBuilder - Multiple Responses', () => {
    test('Multiple Responses', () => {
        const stub = new StubBuilder().get('/example').multipleResponses([
            {
                status: 200,
                body: {
                    status: 'OK!',
                },
                repeat: 1,
            },
            {
                status: 400,
                headers: {
                    'content-type': 'text/html',
                },
                body: 'NOT FOUND!',
                repeat: 999,
            },
        ]);

        const { responses } = stub;
        expect(responses.length).toBe(2);
        expect(responses[0]).toMatchObject({
            is: {
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                body: { status: 'OK!' },
            },
            behaviors: [],
            repeat: 1,
        });
        expect(responses[1]).toMatchObject({
            is: {
                statusCode: 400,
                headers: {
                    'content-type': 'text/html',
                },
                body: 'NOT FOUND!',
            },
            behaviors: [],
            repeat: 999,
        });
    });
});
