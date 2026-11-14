import { MountebankError, MountebankOperation } from './errorHelper';

/**
 * Where the client reports each call to mountebank. Anything with a `debug(message)` method works, e.g. `console`
 * or a pino/winston logger.
 */
export interface MountebankLogger {
    debug: (message: string) => void;
}

export interface HttpResponse {
    status: number;
    /** The body parsed as JSON when it is JSON, otherwise the text ('' when empty). */
    data: unknown;
}

/**
 * Sends one request to mountebank's API with the built-in `fetch`. Never throws because of the HTTP status (callers
 * check it with `checkError`); throws a `MountebankError` for `operation` when mountebank can't be reached at all.
 */
export async function request(
    operation: MountebankOperation,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    body?: unknown,
    logger?: MountebankLogger
): Promise<HttpResponse> {
    const started = Date.now();
    const log = (outcome: string) =>
        logger?.debug(`mountebank-client: ${method} ${url} → ${outcome} (${Date.now() - started} ms)`);
    let response: Response;
    try {
        response = await fetch(url, {
            method,
            headers: {
                accept: 'application/json',
                ...(body === undefined ? {} : { 'content-type': 'application/json' }),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (error) {
        log(`failed: ${networkCause(error)}`);
        throw new MountebankError({
            operation,
            reason: `can't reach mountebank at ${new URL(url).origin} (${networkCause(error)})`,
        });
    }
    const data = parseBody(await response.text());
    log(String(response.status));
    return { status: response.status, data };
}

function parseBody(text: string): unknown {
    if (text === '') {
        return '';
    }
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/** fetch rejects with "fetch failed"; the useful part (ECONNREFUSED, ENOTFOUND, ...) is in `cause`. */
function networkCause(error: unknown): string {
    const cause = (error as { cause?: { code?: string; message?: string } } | undefined)?.cause;
    return cause?.code ?? cause?.message ?? (error instanceof Error ? error.message : String(error));
}
