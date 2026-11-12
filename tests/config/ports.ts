/**
 * Ports used by the integration tests.
 *
 * Set `MB_TEST_PORT_OFFSET` to shift every port (the mountebank server and all imposters) so a second test run,
 * e.g. from a git worktree, doesn't clash with a dev server or another run. With an offset of 1000 the server
 * listens on 3525 and imposter 1111 becomes 2111.
 */
export function parsePortOffset(value: string | undefined): number {
    if (value === undefined || value === '') {
        return 0;
    }
    const offset = Number(value);
    if (!Number.isInteger(offset) || offset < 0) {
        throw new Error(`MB_TEST_PORT_OFFSET must be a non-negative integer, got "${value}"`);
    }
    return offset;
}

const offset = parsePortOffset(process.env['MB_TEST_PORT_OFFSET']);

export const testPort = (port: number): number => port + offset;

export const mountebankPort = testPort(2525);
export const mountebankUrl = `http://localhost:${mountebankPort}`;
