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
