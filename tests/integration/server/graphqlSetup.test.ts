import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { http } from '../../helpers/http';
import { graphQLSchema } from '../../helpers/graphqlSchema';
import { createClient, ImposterBuilder, StubBuilder } from '../../../src';
import { testPort } from '../../config/ports';

// Starts its own mountebank from a folder without a protocols.json, as a user's project would be, to check that
// GraphQL imposters work without any setup.
const serverPort = testPort(2536);
const graphqlPort = testPort(1161);
const url = `http://localhost:${serverPort}`;
const mb = createClient({ url });
const repoRoot = path.resolve(__dirname, '../../..');

let server: ChildProcess;
let cwd: string;

async function waitForServer() {
    for (let i = 0; i < 150; i++) {
        try {
            await http.get(`${url}/config`);
            return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    throw new Error(`mountebank on ${serverPort} did not start`);
}

describe('startMountebank - GraphQL without a protocols.json', () => {
    beforeAll(async () => {
        cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'mbc-no-protocols-'));
        server = spawn(
            'node',
            [
                '--require',
                require.resolve('ts-node/register/transpile-only'),
                path.join(repoRoot, 'scripts/start-mountebank.ts'),
            ],
            {
                cwd,
                // ts-node looks for tsconfig.json from the working directory, which has none.
                env: {
                    ...process.env,
                    MB_PORT: String(serverPort),
                    TS_NODE_PROJECT: path.join(repoRoot, 'tsconfig.json'),
                },
                stdio: 'ignore',
            }
        );
        await waitForServer();
    });

    afterAll(async () => {
        await mb.deleteImposters();
        server.kill();
        await new Promise((resolve) => server.once('exit', resolve));
        fs.rmSync(cwd, { recursive: true, force: true });
    });

    test('generates the protocols file in the temp folder, not the working directory', async () => {
        const { options } = (await http.get(`${url}/config`)).data;

        expect(options.protofile).toBe(path.join(os.tmpdir(), `mountebank-client-${serverPort}-protocols.json`));
        expect(fs.existsSync(path.join(cwd, 'protocols.json'))).toBe(false);
    });

    test('a GraphQL imposter answers', async () => {
        await mb.createImposter(
            new ImposterBuilder({ port: graphqlPort, protocol: 'graphql', schema: graphQLSchema }).addStub(
                new StubBuilder().any({ query: 'getUser', args: { id: 7 } }).response({ data: { id: 7 } })
            )
        );

        const response = await http.post(`http://localhost:${graphqlPort}/`, { query: '{ getUser(id: 7) { id } }' });

        expect(response.data).toEqual({ data: { getUser: { id: 7 } } });
    });
});
