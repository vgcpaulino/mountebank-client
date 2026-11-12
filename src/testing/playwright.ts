/**
 * Playwright helpers: `mountebank-client/playwright`.
 *
 * - `playwrightGlobalSetup(options)` for `globalSetup` in playwright.config: one mountebank server for the whole
 *   run (Playwright uses the function it returns as the teardown).
 * - `withImposters(test, imposters)`: a `test` whose tests start with freshly created imposters.
 *
 * Only Playwright's types are imported; you pass in your own `test`, so no Playwright code is loaded from here.
 */
import type { TestType } from '@playwright/test';
import { ImposterBuilder } from '../builders/imposterBuilder';
import { resetImposters, setupMountebank, SetupMountebankOptions } from './index';

/**
 * Returns a function for Playwright's `globalSetup`. It starts mountebank (or waits for `url`), creates
 * `imposters`, sets `MOUNTEBANK_URL` for the workers, and returns the teardown that stops it.
 *
 * ```js
 * // mountebank.setup.js, with globalSetup: require.resolve('./mountebank.setup.js') in playwright.config
 * module.exports = require('mountebank-client/playwright').playwrightGlobalSetup({ port: 2525 });
 * ```
 */
export function playwrightGlobalSetup(options: SetupMountebankOptions = {}) {
    return async () => {
        const handle = await setupMountebank(options);
        return () => handle.stop();
    };
}

/**
 * Extends Playwright's `test` with an automatic `imposters` fixture that recreates `imposters` before each test,
 * so stubs added in a test, recorded requests and `decorate` state don't leak into the next one. Tests can also
 * use the fixture to get the imposters.
 *
 * Imposters live on fixed ports that the app under test calls, so tests that share them must not run at the same
 * time: use `workers: 1` (or `test.describe.configure({ mode: 'serial' })`), or give each worker its own ports.
 *
 * ```ts
 * import { test as base, expect } from '@playwright/test';
 * import { withImposters } from 'mountebank-client/playwright';
 *
 * const test = withImposters(base, [usersApi]);
 * test('shows the user', async ({ page }) => { ... });
 * ```
 */
export function withImposters<T extends {}, W extends {}>(test: TestType<T, W>, imposters: ImposterBuilder[]) {
    // Playwright requires the first parameter to be an object destructuring pattern (it reads the fixture's source).
    // eslint-disable-next-line no-empty-pattern
    const fixture = async ({}: Record<string, never>, use: (value: ImposterBuilder[]) => Promise<void>) => {
        await resetImposters(imposters);
        await use(imposters);
    };
    // The cast only bridges this project's TypeScript 4.7 and newer Playwright fixture typings; the returned
    // TestType is still typed with the `imposters` fixture.
    return test.extend<{ imposters: ImposterBuilder[] }>({ imposters: [fixture, { auto: true }] } as never);
}
