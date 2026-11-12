import { Imposter, LogLevel } from '../interfaces';
import { addImposter, addStub } from '../client/mountebankClient';

export const startMountebank = async ({
    port = 2525,
    allowInjection = true,
    imposters = [],
    logLevel = 'info',
}: {
    port?: number;
    allowInjection?: boolean;
    imposters?: Imposter[];
    logLevel?: LogLevel;
}) => {
    const startOptions = {
        debug: false,
        allowInjection,
        'allow-injection': allowInjection,
        port,
        noParse: false,
        'no-parse': false,
        pidfile: 'mb.pid',
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
                file: { path: 'mb.log', format: 'json' },
            },
        },
    };
    // Loaded lazily so importing this package never loads mountebank itself
    // (it's only needed to start a server in-process).
    const { create } = await import('@mbtest/mountebank/src/mountebank');
    const server = await create(startOptions);

    for (const imposter of imposters) {
        const { port: imposterPort, protocol, defaultResponse, schema, allowCORS, stubs } = imposter;

        // TODO: Mock-Provider: Implement a function to add all imposters in a single request;
        await addImposter({
            providerUrl: `http://localhost:${port}`,
            port: imposterPort,
            protocol,
            defaultResponse,
            schema,
            allowCORS,
            stubs,
        });
    }

    return server;
};
