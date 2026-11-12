import axios from 'axios';
import { ChildProcess, spawn } from 'child_process';
import { addImposter as createImposter, deleteImposters, getImposters, replaceStubs, StubBuilder } from '../../../src';
import { testPort } from '../../config/ports';

// deleteImposters() wipes every imposter, so these tests use their own mountebank server instead of the shared
// one the other test files run against in parallel.
const serverPort = testPort(2535);
const providerUrl = `http://localhost:${serverPort}`;
const portA = testPort(1131);
const portB = testPort(1132);

let server: ChildProcess;

async function waitForServer() {
    for (let i = 0; i < 100; i++) {
        try {
            await axios.get(`${providerUrl}/config`);
            return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    throw new Error(`mountebank on ${serverPort} did not start`);
}

describe('Imposter lifecycle', () => {
    beforeAll(async () => {
        server = spawn('node', ['--require', 'ts-node/register/transpile-only', './scripts/start-mountebank.ts'], {
            env: { ...process.env, MB_PORT: String(serverPort) },
            stdio: 'ignore',
        });
        await waitForServer();
    });

    afterAll(async () => {
        server.kill();
        await new Promise((resolve) => server.once('exit', resolve));
    });

    test('getImposters lists every imposter with its request count', async () => {
        await addImposter(portA, 'orders');
        await addImposter(portB);
        await axios.get(`http://localhost:${portA}/`, { validateStatus: null });

        const imposters = await getImposters({ providerUrl });

        expect(imposters).toEqual(
            expect.arrayContaining([
                { port: portA, protocol: 'http', name: 'orders', numberOfRequests: 1 },
                { port: portB, protocol: 'http', numberOfRequests: 0 },
            ])
        );
    });

    test('deleteImposters removes them all', async () => {
        await deleteImposters({ providerUrl });

        expect(await getImposters({ providerUrl })).toEqual([]);
        // and is fine to call again on an empty server
        await expect(deleteImposters({ providerUrl })).resolves.toBeUndefined();
    });

    test('replaceStubs swaps all stubs at once, tying StubBuilders to the imposter', async () => {
        await addImposter(portA);
        const pong = new StubBuilder().get('/ping').response({ status: 200, body: 'pong' });

        await replaceStubs({ providerUrl, imposterPort: portA, stubs: [pong] });

        const response = await axios.get(`http://localhost:${portA}/ping`);
        expect(response.data).toBe('pong');
        expect(pong.imposterPort).toBe(portA);

        await replaceStubs({ providerUrl, imposterPort: portA, stubs: [] });
        expect((await axios.get(`http://localhost:${portA}/ping`)).data).toBe('');
    });
});

async function addImposter(port: number, name?: string) {
    await createImposter({ providerUrl, port, protocol: 'http', name });
}
