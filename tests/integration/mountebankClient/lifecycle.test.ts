import { http } from '../../helpers/http';
import { ChildProcess, spawn } from 'child_process';
import { createClient, ImposterBuilder, StubBuilder } from '../../../src';
import { testPort } from '../../config/ports';

// deleteImposters() wipes every imposter, so these tests use their own mountebank server instead of the shared
// one the other test files run against in parallel.
const serverPort = testPort(2535);
const url = `http://localhost:${serverPort}`;
const mb = createClient({ url });
const portA = testPort(1131);
const portB = testPort(1132);

let server: ChildProcess;

async function waitForServer() {
    for (let i = 0; i < 100; i++) {
        try {
            await http.get(`${url}/config`);
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
        await http.get(`http://localhost:${portA}/`);

        const imposters = await mb.getImposters();

        expect(imposters).toEqual(
            expect.arrayContaining([
                { port: portA, protocol: 'http', name: 'orders', numberOfRequests: 1 },
                { port: portB, protocol: 'http', numberOfRequests: 0 },
            ])
        );
    });

    test('deleteImposters removes them all', async () => {
        await mb.deleteImposters();

        expect(await mb.getImposters()).toEqual([]);
        // and is fine to call again on an empty server
        await expect(mb.deleteImposters()).resolves.toBeUndefined();
    });

    test('replaceStubs swaps all stubs at once', async () => {
        const imposter = await addImposter(portA);
        const pong = new StubBuilder().get('/ping').response({ status: 200, body: 'pong' });

        await imposter.replaceStubs([pong]);

        const response = await http.get(`http://localhost:${portA}/ping`);
        expect(response.data).toBe('pong');

        await imposter.replaceStubs([]);
        expect((await http.get(`http://localhost:${portA}/ping`)).data).toBe('');
    });
});

function addImposter(port: number, name?: string) {
    return mb.createImposter(new ImposterBuilder({ port, protocol: 'http', name }));
}
