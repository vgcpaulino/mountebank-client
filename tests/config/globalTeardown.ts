import { teardown as teardownDevServer } from 'jest-dev-server';

module.exports = async function globalTeardown() {
    await teardownDevServer(globalThis.servers);
    // globalThis.servers.close(() => console.log('######### END'));
};
