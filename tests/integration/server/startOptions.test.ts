import { http } from '../../helpers/http';
import * as os from 'os';
import * as path from 'path';
import { addImposter, deleteImposter, getLogs } from '../../../src';
import { mountebankUrl, testPort } from '../../config/ports';

// The test server is started with startMountebank's defaults (tests/config/globalSetup.ts -> jestGlobalSetup),
// so its /config shows what those defaults are.
describe('startMountebank - safe defaults', () => {
    let options: Record<string, any>;

    beforeAll(async () => {
        options = (await http.get(`${mountebankUrl}/config`)).data.options;
    });

    test('only accepts connections from this machine, by listening on 127.0.0.1', () => {
        expect(options.host).toBe('127.0.0.1');
        // Not mountebank's per-request localOnly check: it blocks mb-graphql's callbacks (no IP), breaking GraphQL.
        expect(options.localOnly).toBe(false);
    });

    test('writes its log to the system temp folder, not the project', () => {
        const logFile: string = options.log.transports.file.path;

        expect(path.dirname(logFile)).toBe(os.tmpdir());
        expect(path.resolve(logFile).startsWith(process.cwd())).toBe(false);
    });

    test('getLogs still works with the log in the temp folder', async () => {
        // The test server logs at 'error' level, so make sure there is an entry: a duplicate imposter is logged as
        // "error creating imposter". (Relying on other test files to log something made this order-dependent.)
        const port = testPort(1150);
        await addImposter({ port, protocol: 'http' });
        await addImposter({ port, protocol: 'http' }).catch(() => undefined);
        await deleteImposter({ port });

        const logs = await getLogs();

        expect(logs.some((entry) => entry.message.includes('error creating imposter'))).toBe(true);
        expect(logs.some((entry) => entry.message === 'No logfile')).toBe(false);
    });
});
