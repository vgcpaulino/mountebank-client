// "Fuzzy network" example: a proxy in front of a backend that delays every response by a random time between
// MIN_DELAY and MAX_DELAY ms, so concurrent requests come back out of order. Point your app at the proxy to see how
// it copes with a later request finishing first (stale data, flickering UI, race conditions).
//
//   yarn example:fuzzy                                   # proxies the fake backend this script starts
//   BACKEND_URL=https://staging.example.com yarn example:fuzzy
//   MIN_DELAY=0 MAX_DELAY=3000 yarn example:fuzzy
//
// The proxy listens on http://localhost:8091 and the fake backend on http://localhost:8090. Ctrl+C stops both.
import { createClient, ImposterBuilder, StubBuilder } from '../../src';
import { startMountebank } from '../../src/server';

const mountebankPort = Number(process.env.MB_PORT ?? 2525);
const backendPort = 8090;
const proxyPort = 8091;
const minDelay = Number(process.env.MIN_DELAY ?? 100);
const maxDelay = Number(process.env.MAX_DELAY ?? 1500);
const backendUrl = process.env.BACKEND_URL ?? `http://localhost:${backendPort}`;

/**
 * A `decorate` function that holds the response for a random time between `min` and `max` ms. mountebank runs it
 * from its source text, so the numbers are written into that text instead of being read from outside the function.
 */
function randomDelay(min: number, max: number) {
    return `(config) => {
        const delay = ${min} + Math.floor(Math.random() * ${max - min + 1});
        return new Promise((resolve) => setTimeout(() => resolve(config.response), delay));
    }`;
}

// Stands in for a real backend: GET /items/<id> answers { id }, immediately.
const fakeBackend = new ImposterBuilder({ port: backendPort, protocol: 'http', name: 'fake backend' }).addStub(
    new StubBuilder().get('/items/', { operator: 'startsWith' }).response({
        status: 200,
        body: { id: '${id}' },
        copyFromPath: { into: '${id}', using: { method: 'regex', selector: '[^/]+$' } },
    })
);

// Forwards everything to the backend, records nothing, and adds the random delay to each response.
const fuzzyProxy = new ImposterBuilder({ port: proxyPort, protocol: 'http', name: 'fuzzy network' }).addStub(
    new StubBuilder()
        .get('/', { operator: 'startsWith' })
        .proxyResponse({ url: backendUrl, proxyMode: 'proxyTransparent', decorate: randomDelay(minDelay, maxDelay) })
);

async function main() {
    const server = await startMountebank({ port: mountebankPort, logLevel: 'warn' });
    const mb = createClient({ url: `http://localhost:${mountebankPort}` });
    if (!process.env.BACKEND_URL) {
        await mb.createImposter(fakeBackend);
    }
    await mb.createImposter(fuzzyProxy);

    // Fire five requests at once and print them in the order they come back.
    if (!process.env.BACKEND_URL) {
        const order: string[] = [];
        await Promise.all(
            [1, 2, 3, 4, 5].map(async (id) => {
                const started = Date.now();
                await fetch(`http://localhost:${proxyPort}/items/${id}`);
                order.push(`item ${id} (${Date.now() - started} ms)`);
            })
        );
        console.log(`Sent items 1-5 at once; they came back as: ${order.join(', ')}`);
    }

    console.log(`Fuzzy proxy on http://localhost:${proxyPort} → ${backendUrl}, delay ${minDelay}-${maxDelay} ms.`);
    process.once('SIGINT', () => server.close(() => process.exit(0)));
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
