import { ImposterBuilder } from '../builders/imposterBuilder';
import { deleteImposter } from '../client/mountebankClient';
import { resetImposters, waitForMountebank } from '../testing';
import { startMountebank, StartMountebankOptions } from './mountebankServer';

export interface SetupMountebankOptions extends Omit<StartMountebankOptions, 'imposters'> {
    /**
     * Use a mountebank server that is already running (Docker, `mb`, a remote host) instead of starting one in this
     * process, e.g. `'http://localhost:2525'`. Setup waits until it answers.
     */
    url?: string;
    /** Imposters to create once the server is up. */
    imposters?: ImposterBuilder[];
    /** How long to wait for an external server (`url`) to answer, in ms. Defaults to 30 000. */
    timeout?: number;
}

export interface MountebankHandle {
    /** The server's URL; also put in `process.env.MOUNTEBANK_URL`. */
    url: string;
    /**
     * Stops the server if setup started it. For an external server (`url`), deletes the imposters setup created
     * and leaves the server running.
     */
    stop: () => Promise<void>;
}

/**
 * Gets a mountebank server ready for a test run: starts one in this process (or waits for an external one, with
 * `url`), creates `imposters`, and sets `process.env.MOUNTEBANK_URL` so client calls made later, and in processes
 * started later such as test workers, go to it. Call it from your test runner's global setup, and `stop()` from its
 * global teardown. Not for use inside Jest test files: mountebank can't be loaded there.
 */
export async function setupMountebank({
    url,
    imposters = [],
    timeout = 30000,
    ...startOptions
}: SetupMountebankOptions = {}): Promise<MountebankHandle> {
    let stopServer: () => Promise<void>;
    let serverUrl: string;

    if (url) {
        serverUrl = url.replace(/\/+$/, '');
        await waitForMountebank({ url: serverUrl, timeout });
        stopServer = async () => {
            await Promise.all(
                imposters.map((imposter) => deleteImposter({ providerUrl: serverUrl, port: imposter.port }))
            );
        };
    } else {
        const port = startOptions.port ?? 2525;
        const server = await startMountebank({ ...startOptions, port });
        serverUrl = `http://localhost:${port}`;
        stopServer = () =>
            new Promise<void>((resolve) => {
                server.close(() => {
                    resolve();
                });
            });
    }

    process.env.MOUNTEBANK_URL = serverUrl;
    await resetImposters(imposters, { providerUrl: serverUrl });

    return { url: serverUrl, stop: stopServer };
}
