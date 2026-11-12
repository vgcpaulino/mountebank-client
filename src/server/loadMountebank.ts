export interface MountebankModule {
    create: (options: object) => Promise<{ close: (callback?: () => void) => void }>;
}

/**
 * Loads mountebank's `create()`. `@mbtest/mountebank` is an optional peer dependency, so when it isn't installed,
 * say how to install it instead of failing with a bare "Cannot find module". Loaded lazily, so importing this
 * package never loads mountebank.
 */
export async function loadMountebank(
    importer: () => Promise<unknown> = () => import('@mbtest/mountebank/src/mountebank.js')
): Promise<MountebankModule> {
    try {
        return (await importer()) as MountebankModule;
    } catch (error) {
        const { code, message } = (error ?? {}) as { code?: string; message?: string };
        const notInstalled =
            (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') &&
            String(message).includes('@mbtest/mountebank');
        if (notInstalled) {
            throw new Error(
                "Starting mountebank in-process needs '@mbtest/mountebank', which isn't installed. Install it with " +
                    '`npm install --save-dev @mbtest/mountebank` (and `mb-graphql` for GraphQL imposters), or point the ' +
                    'client at a mountebank server you run yourself.',
                { cause: error }
            );
        }
        throw error;
    }
}
