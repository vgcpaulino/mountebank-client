import axios from 'axios';
import * as os from 'os';
import * as path from 'path';
import { getLogs } from '../../../src';
import { mountebankUrl } from '../../config/ports';

// The test server is started with startMountebank's defaults (tests/config/globalSetup.ts -> src/start.ts),
// so its /config shows what those defaults are.
describe('startMountebank - safe defaults', () => {
    let options: Record<string, any>;

    beforeAll(async () => {
        options = (await axios.get(`${mountebankUrl}/config`)).data.options;
    });

    test('only accepts connections from this machine', () => {
        expect(options.localOnly).toBe(true);
    });

    test("writes its log to the system temp folder, not the project", () => {
        const logFile: string = options.log.transports.file.path;

        expect(path.dirname(logFile)).toBe(os.tmpdir());
        expect(path.resolve(logFile).startsWith(process.cwd())).toBe(false);
    });

    test('getLogs still works with the log in the temp folder', async () => {
        const logs = await getLogs();

        expect(logs.length).toBeGreaterThan(0);
        expect(logs.some((entry) => entry.message === 'No logfile')).toBe(false);
    });
});
