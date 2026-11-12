import { ImposterBuilder } from '../builders/imposterBuilder';
import { addImposter, deleteImposter } from '../client/mountebankClient';

/** Waits until the mountebank server at `url` answers, or throws after `timeout` ms (default 30 000). */
export async function waitForMountebank({ url, timeout = 30000 }: { url: string; timeout?: number }) {
    const deadline = Date.now() + timeout;
    let lastError: unknown;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${url.replace(/\/+$/, '')}/config`);
            await response.body?.cancel();
            if (response.status === 200) {
                return;
            }
            lastError = new Error(`HTTP ${response.status}`);
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`mountebank at ${url} did not answer within ${timeout} ms (${String(lastError)})`);
}

/**
 * Recreates each imposter from its definition: deletes whatever is on its port, then creates it again. Stubs
 * added later, recorded requests and `decorate` state are gone afterwards. Only these imposters' ports are
 * touched, so test files that use different ports can reset in parallel.
 */
export async function resetImposters(
    imposters: ImposterBuilder[],
    { providerUrl = process.env.MOUNTEBANK_URL || 'http://localhost:2525' }: { providerUrl?: string } = {}
) {
    await Promise.all(
        imposters.map(async (imposter) => {
            await deleteImposter({ providerUrl, port: imposter.port });
            await addImposter({
                providerUrl,
                port: imposter.port,
                protocol: imposter.protocol,
                name: imposter.name,
                schema: imposter.schema,
                allowCORS: imposter.allowCORS,
                recordRequests: imposter.recordRequests,
                defaultResponse: imposter.defaultResponse,
                stubs: imposter.stubs,
            });
        })
    );
}
