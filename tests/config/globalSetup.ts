import { setup as setupDevServer } from 'jest-dev-server';
import { mountebankPort, mountebankUrl } from './ports';

module.exports = async function globalSetup() {
    // Inherited by `yarn start` (src/start.ts reads MB_PORT) and by the Jest workers (the client reads MOUNTEBANK_URL).
    process.env['MB_PORT'] = String(mountebankPort);
    process.env['MOUNTEBANK_URL'] = mountebankUrl;

    globalThis.servers = await setupDevServer({
        command: `yarn start`,
        launchTimeout: 50000,
        port: mountebankPort,
    });
};
