import * as os from 'os';
import * as path from 'path';
import { Imposter, LogLevel } from '../interfaces';
import { createClient } from '../client/mountebankClient';
import { loadMountebank } from './loadMountebank';

export interface StartMountebankOptions {
    /** Port for mountebank's own API. Defaults to 2525. */
    port?: number;
    /** Let mountebank run JavaScript you send it (needed for `decorate` and the default `chaos`). Defaults to true. */
    allowInjection?: boolean;
    /** Imposters to create once the server is listening. */
    imposters?: Imposter[];
    /** Defaults to 'info'. */
    logLevel?: LogLevel;
    /**
     * Where mountebank writes its log, which `getLogs()` reads. Defaults to a file in the system temp folder, so
     * nothing is written into your project. Pass a path to choose the file, or `false` to write no log file
     * (`getLogs()` then returns only a "No logfile" entry).
     */
    logFile?: string | false;
    /**
     * Accept connections from other machines. Defaults to false: mountebank's API and the HTTP/HTTPS imposters
     * listen on 127.0.0.1 only (GraphQL imposters always listen on every interface; mb-graphql doesn't support
     * choosing one). Turn it on when, for example, a container or another host has to reach the imposters.
     */
    allowRemoteConnections?: boolean;
}

export const startMountebank = async ({
    port = 2525,
    allowInjection = true,
    imposters = [],
    logLevel = 'info',
    logFile = path.join(os.tmpdir(), `mountebank-client-${port}.log`),
    allowRemoteConnections = false,
}: StartMountebankOptions) => {
    const startOptions = {
        debug: false,
        allowInjection,
        'allow-injection': allowInjection,
        port,
        noParse: false,
        'no-parse': false,
        // Local-only by binding mountebank's API and the HTTP/HTTPS imposters to the loopback address, not with
        // mountebank's localOnly: that checks each request's IP, and mb-graphql's callbacks carry none, so every
        // GraphQL request was blocked. (mb-graphql ignores `host`, so GraphQL imposters still listen everywhere.)
        ...(allowRemoteConnections ? {} : { host: '127.0.0.1' }),
        localOnly: false,
        'local-only': false,
        ipWhitelist: ['*'],
        'ip-whitelist': '*',
        mock: false,
        heroku: false,
        protofile: './protocols.json',
        origin: false,
        log: {
            level: logLevel,
            transports: {
                console: {
                    colorize: true,
                    format: 'MockProvider: %level: %message',
                },
                ...(logFile === false ? {} : { file: { path: logFile, format: 'json' } }),
            },
        },
    };
    const mountebank = await loadMountebank();
    const server = await mountebank.create(startOptions);

    // mountebank's close() only stops its own API server: the imposters (and mb-graphql processes) keep listening
    // and keep the process alive. Delete them first; mountebank's CLI does the equivalent when it exits.
    const client = createClient({ url: `http://localhost:${port}` });
    const closeServer = server.close.bind(server);
    server.close = (callback?: () => void) => {
        client.deleteImposters().then(
            () => {
                closeServer(callback);
            },
            () => {
                closeServer(callback); // still close the server if the imposters couldn't be deleted
            }
        );
    };

    for (const imposter of imposters) {
        await client.createImposter(imposter);
    }

    return server;
};
