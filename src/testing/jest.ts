/**
 * Jest helpers: `mountebank-client/jest`.
 *
 * - `jestGlobalSetup(options)` / `jestGlobalTeardown()` for `globalSetup` / `globalTeardown` in jest.config: one
 *   mountebank server for the whole run, started in Jest's main process (mountebank can't be loaded inside test
 *   files, but global setup runs in plain Node).
 * - `useImposters(imposters)` in a test file: creates the imposters before the file's tests and resets them before
 *   each test.
 *
 * This file doesn't import Jest: it uses the `beforeAll` / `beforeEach` / `afterAll` globals that Jest defines.
 */
import { ImposterBuilder } from '../builders/imposterBuilder';
import { deleteImposter } from '../client/mountebankClient';
import { MountebankHandle, setupMountebank, SetupMountebankOptions } from '../server/setupMountebank';
import { resetImposters } from './index';

const handleKey = '__mountebankClientJestHandle__';

type Hook = (fn: () => Promise<void>) => void;

/**
 * Returns a function for Jest's `globalSetup`. It starts mountebank (or waits for `url`), creates `imposters`, and
 * sets `MOUNTEBANK_URL` so the test workers' client calls go to that server.
 *
 * ```js
 * // jest.global-setup.js
 * module.exports = require('mountebank-client/jest').jestGlobalSetup({ port: 2525 });
 * ```
 */
export function jestGlobalSetup(options: SetupMountebankOptions = {}) {
    return async () => {
        (globalThis as Record<string, unknown>)[handleKey] = await setupMountebank(options);
    };
}

/**
 * Returns a function for Jest's `globalTeardown`: stops what `jestGlobalSetup` started.
 *
 * ```js
 * // jest.global-teardown.js
 * module.exports = require('mountebank-client/jest').jestGlobalTeardown();
 * ```
 */
export function jestGlobalTeardown() {
    return async () => {
        const handle = (globalThis as Record<string, unknown>)[handleKey] as MountebankHandle | undefined;
        (globalThis as Record<string, unknown>)[handleKey] = undefined;
        await handle?.stop();
    };
}

/**
 * Call at the top of a test file. Creates `imposters` before the file's tests, recreates them before each test
 * (so stubs added in a test, recorded requests and `decorate` state don't leak into the next one), and deletes
 * them after the file. Give each test file its own imposter ports: Jest runs files in parallel.
 *
 * Pass `{ resetBeforeEach: false }` to create them once per file instead.
 */
export function useImposters(imposters: ImposterBuilder[], { resetBeforeEach = true } = {}) {
    const hooks = globalThis as unknown as { beforeAll?: Hook; beforeEach?: Hook; afterAll?: Hook };
    if (!hooks.beforeAll || !hooks.beforeEach || !hooks.afterAll) {
        throw new Error('useImposters must be called in a test file, where beforeAll/beforeEach/afterAll exist');
    }

    hooks.beforeAll(() => resetImposters(imposters));
    if (resetBeforeEach) {
        hooks.beforeEach(() => resetImposters(imposters));
    }
    hooks.afterAll(async () => {
        await Promise.all(imposters.map((imposter) => deleteImposter({ port: imposter.port })));
    });
}
