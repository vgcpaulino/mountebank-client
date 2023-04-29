import { setup as setupDevServer } from 'jest-dev-server';

module.exports = async function globalSetup() {
    globalThis.servers = await setupDevServer({
        command: `yarn start`,
        launchTimeout: 50000,
        port: 2525,
    });
};
