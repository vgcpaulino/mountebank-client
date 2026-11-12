import { loadMountebank } from '../../../src/server/loadMountebank';

const failWith = (code: string, message: string) => () => Promise.reject(Object.assign(new Error(message), { code }));

describe('loadMountebank', () => {
    test('returns the loaded module', async () => {
        const module = { create: jest.fn() };

        await expect(loadMountebank(() => Promise.resolve(module))).resolves.toBe(module);
    });

    test.each(['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'])(
        'explains how to install @mbtest/mountebank when it is missing (%s)',
        async (code) => {
            const importer = failWith(code, "Cannot find module '@mbtest/mountebank/src/mountebank.js'");

            await expect(loadMountebank(importer)).rejects.toMatchObject({
                cause: expect.objectContaining({ code }),
            });
            await expect(loadMountebank(importer)).rejects.toThrow(
                "Starting mountebank in-process needs '@mbtest/mountebank', which isn't installed. " +
                    'Install it with `npm install --save-dev @mbtest/mountebank`'
            );
        }
    );

    test("rethrows other errors as they are, e.g. a missing module inside mountebank's own dependencies", async () => {
        const importer = failWith('MODULE_NOT_FOUND', "Cannot find module 'some-other-package'");

        await expect(loadMountebank(importer)).rejects.toThrow("Cannot find module 'some-other-package'");
    });
});
