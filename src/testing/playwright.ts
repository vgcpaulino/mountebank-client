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
import { setupMountebank, SetupMountebankOptions } from '../server/setupMountebank';
import { resetImposters } from './index';

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
export function withImposters<T extends object, W extends object>(test: TestType<T, W>, imposters: ImposterBuilder[]) {
    // Playwright's fixture type is a conditional type over the caller's own fixtures (T, W), which TypeScript can't
    // resolve inside a generic function. Extend the base TestType instead, where the fixture is fully type-checked,
    // and give the result the caller's fixtures back.
    const extended = (test as unknown as TestType<object, object>).extend<{ imposters: ImposterBuilder[] }>({
        imposters: [
            // Playwright reads the fixture's source and requires an object destructuring pattern here.
            // eslint-disable-next-line no-empty-pattern
            async ({}, use) => {
                await resetImposters(imposters);
                await use(imposters);
            },
            { auto: true },
        ],
    });
    return extended as unknown as TestType<T & { imposters: ImposterBuilder[] }, W>;
}
