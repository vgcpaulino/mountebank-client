import { setup as setupDevServer } from 'jest-dev-server';
import { mountebankPort, mountebankUrl } from './ports';

module.exports = async function globalSetup() {
    // Inherited by the server process (src/start.ts reads MB_PORT) and by the Jest workers (the client reads MOUNTEBANK_URL).
    process.env['MB_PORT'] = String(mountebankPort);
    process.env['MOUNTEBANK_URL'] = mountebankUrl;

    // A single plain `node` process (no yarn, no ts-node-dev watcher), so teardown's tree-kill stops the server.
    // Through `yarn start`, ts-node-dev's forked child outlived the kill and kept Jest from exiting.
    globalThis.servers = await setupDevServer({
        command: `node --require ts-node/register/transpile-only ./src/start.ts`,
        launchTimeout: 50000,
        port: mountebankPort,
    });
};
