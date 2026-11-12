import { checkError, MountebankError } from '../../../src/client/errorHelper';

const response = (status: number, data?: unknown) => ({ status, data });

describe('checkError', () => {
    test('does nothing on the expected success status', () => {
        expect(() => checkError({ errorCode: 'ADD_IMPOSTER', response: response(201) })).not.toThrow();
        expect(() => checkError({ errorCode: 'DELETE_STUB', response: response(200) })).not.toThrow();
    });

    test("throws a MountebankError with mountebank's own message", () => {
        const failed = response(400, {
            errors: [{ code: 'resource conflict', message: 'Port 8080 is already in use' }],
        });

        let error: unknown;
        try {
            checkError({ errorCode: 'ADD_IMPOSTER', response: failed });
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(MountebankError);
        expect(error).toBeInstanceOf(Error);
        expect(error).toMatchObject({
            name: 'MountebankError',
            operation: 'ADD_IMPOSTER',
            status: 400,
            errors: [{ code: 'resource conflict', message: 'Port 8080 is already in use' }],
            message: 'Creating the imposter failed (HTTP 400): resource conflict: Port 8080 is already in use',
        });
    });

    test('explains an EADDRINUSE that mountebank passes through without a message', () => {
        const failed = response(400, { errors: [{ code: 'EADDRINUSE', errno: -48, address: '::', port: 8080 }] });

        expect(() => checkError({ errorCode: 'ADD_IMPOSTER', response: failed })).toThrow(
            'Creating the imposter failed (HTTP 400): port 8080 is already in use (EADDRINUSE). ' +
                'Delete the existing imposter first (deleteImposter) or use another port'
        );
    });

    test('joins several mountebank errors', () => {
        const failed = response(400, {
            errors: [
                { code: 'bad data', message: 'first' },
                { code: 'bad data', message: 'second' },
            ],
        });

        expect(() => checkError({ errorCode: 'ADD_STUB', response: failed })).toThrow(
            'Adding the stub failed (HTTP 400): bad data: first; bad data: second'
        );
    });

    test('describes every operation, with no generic fallback', () => {
        expect(() => checkError({ errorCode: 'GET_LOGS', response: response(500) })).toThrow(
            'Getting the logs failed (HTTP 500): no details from mountebank'
        );
        expect(() => checkError({ errorCode: 'DELETE_STUB', response: response(404) })).toThrow(
            'Deleting the stub failed (HTTP 404)'
        );
        expect(() => checkError({ errorCode: 'DELETE_IMPOSTER', response: response(500) })).toThrow(
            'Deleting the imposter failed (HTTP 500)'
        );
    });

    test('includes an unexpected body that has no errors array', () => {
        expect(() => checkError({ errorCode: 'GET_IMPOSTER', response: response(502, 'Bad Gateway') })).toThrow(
            'Getting the imposter failed (HTTP 502): unexpected response Bad Gateway'
        );
    });
});

describe('MountebankError', () => {
    test('can carry a client-side reason without an HTTP status', () => {
        const error = new MountebankError({ operation: 'DELETE_STUB', reason: 'no stub with ID abc' });

        expect(error.message).toBe('Deleting the stub failed: no stub with ID abc');
        expect(error.status).toBeUndefined();
        expect(error.errors).toEqual([]);
    });
});
