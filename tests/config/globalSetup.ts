import { setup as setupDevServer } from 'jest-dev-server';
import { startMountebank } from '../../src';

module.exports = async function globalSetup() {
    globalThis.servers = await setupDevServer({
        command: `yarn start`,
        launchTimeout: 50000,
        port: 2525,
    });

    // globalThis.servers = await startMountebank({
    //     port: 2525,
    //     allowInjection: true,
    //     logLevel: 'debug',
    // });
};
