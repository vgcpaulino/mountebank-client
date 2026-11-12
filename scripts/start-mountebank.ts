// Dev/test mountebank server: `yarn start`, and what the integration tests run (tests/config/globalSetup.ts).
// Not part of the published package.
import { startMountebank } from '../src/server';

export default startMountebank({
    port: parseInt(process.env.MB_PORT || '') || 2525,
    allowInjection: true,
    logLevel: 'debug',
});
