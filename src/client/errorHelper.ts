import { AxiosResponse } from 'axios';

export type MountebankOperation =
    | 'ADD_IMPOSTER'
    | 'GET_IMPOSTER'
    | 'DELETE_IMPOSTER'
    | 'ADD_STUB'
    | 'DELETE_STUB'
    | 'GET_LOGS';

/** One entry of the `errors` array mountebank sends back, e.g. `{ code: 'bad data', message: '...' }`. */
export interface MountebankErrorDetail {
    code?: string;
    message?: string;
    source?: unknown;
    data?: unknown;
    /** Set on low-level errors such as `EADDRINUSE`, which mountebank passes through without a message. */
    port?: number;
}

/** mountebank passes some Node errors through as-is (code, no message); say what they mean. */
function describeDetail({ code, message, port }: MountebankErrorDetail): string {
    if (!message && code === 'EADDRINUSE') {
        const which = port !== undefined ? `port ${port}` : 'the port';
        return `${which} is already in use (EADDRINUSE). Delete the existing imposter first (deleteImposter) or use another port`;
    }
    return [code, message].filter(Boolean).join(': ');
}

const successStatus: Record<MountebankOperation, number> = {
    ADD_IMPOSTER: 201,
    GET_IMPOSTER: 200,
    DELETE_IMPOSTER: 200,
    ADD_STUB: 200,
    DELETE_STUB: 200,
    GET_LOGS: 200,
};

const describe: Record<MountebankOperation, string> = {
    ADD_IMPOSTER: 'Creating the imposter',
    GET_IMPOSTER: 'Getting the imposter',
    DELETE_IMPOSTER: 'Deleting the imposter',
    ADD_STUB: 'Adding the stub',
    DELETE_STUB: 'Deleting the stub',
    GET_LOGS: 'Getting the logs',
};

/**
 * Thrown when mountebank rejects a request, or when the client can't do what was asked (e.g. the stub to delete
 * isn't on the imposter). The message says what failed and why, in mountebank's own words when it gave any.
 */
export class MountebankError extends Error {
    /** What the client was doing. */
    readonly operation: MountebankOperation;
    /** The HTTP status mountebank answered with, if the failure came from mountebank. */
    readonly status?: number;
    /** mountebank's `errors` array, if it sent one. */
    readonly errors: MountebankErrorDetail[];

    constructor({
        operation,
        status,
        errors = [],
        reason,
    }: {
        operation: MountebankOperation;
        status?: number;
        errors?: MountebankErrorDetail[];
        reason?: string;
    }) {
        const why =
            reason ??
            (errors
                .map(describeDetail)
                .filter(Boolean)
                .join('; ') ||
                'no details from mountebank');
        super(`${describe[operation]} failed${status !== undefined ? ` (HTTP ${status})` : ''}: ${why}`);
        this.name = 'MountebankError';
        this.operation = operation;
        this.status = status;
        this.errors = errors;
    }
}

export function checkError({ errorCode, response }: { errorCode: MountebankOperation; response: AxiosResponse }) {
    if (response.status !== successStatus[errorCode]) {
        const data = response.data;
        const errors: MountebankErrorDetail[] = Array.isArray(data?.errors) ? data.errors : [];
        const reason =
            errors.length === 0 && data !== undefined && data !== ''
                ? `unexpected response ${typeof data === 'string' ? data : JSON.stringify(data)}`
                : undefined;
        throw new MountebankError({ operation: errorCode, status: response.status, errors, reason });
    }
}
