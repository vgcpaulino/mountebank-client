import { StubBuilder } from '../../src';

describe('StubBuilder', () => {
    test('With Repeat', () => {
        const stub = new StubBuilder().get('/decorateFunction').response({
            status: 200,
            body: { message: 'Welcome!' },
            repeat: 999,
        });

        const { responses } = stub;

        expect(responses.length).toBe(1);
        expect(responses[0].repeat).toBe(999);
    });

    test('Without Repeat', () => {
        const stub = new StubBuilder()
            .get('/decorateFunction')
            .response({ status: 200, body: { message: 'Welcome!' } });

        const { responses } = stub;

        expect(responses.length).toBe(1);
        expect(responses[0].repeat).toBeUndefined();
    });
});
