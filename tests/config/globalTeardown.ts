import { teardown as teardownDevServer } from 'jest-dev-server';

module.exports = async function globalTeardown() {
    // if (!process.env.DOCKER) {
    //     await teardownDevServer(globalThis.servers);
    // }
};
