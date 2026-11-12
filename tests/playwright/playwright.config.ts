import { defineConfig } from '@playwright/test';

// Tests for mountebank-client/playwright. Uses only Playwright's `request` fixture, so no browser is needed.
export default defineConfig({
    testDir: __dirname,
    testMatch: '*.spec.ts',
    globalSetup: require.resolve('./global-setup.ts'),
    workers: 1, // the tests share imposter ports
    reporter: 'line',
});
