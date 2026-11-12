import { jestGlobalSetup } from '../../src/testing/jest';
import { mountebankPort } from './ports';

// The integration tests run against one mountebank server, started in Jest's main process by the package's own
// Jest helper. It sets MOUNTEBANK_URL, which the test workers' client calls use.
module.exports = jestGlobalSetup({ port: mountebankPort, logLevel: 'error' });
