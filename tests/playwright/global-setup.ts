import { playwrightGlobalSetup } from '../../src/testing/playwright';
import { testPort } from '../config/ports';

export default playwrightGlobalSetup({ port: testPort(2545), logLevel: 'error' });
