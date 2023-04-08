import { create } from 'mountebank/src/mountebank';

export const startMountebank = async ({
    port = 2525,
    allowInjection = true,
    imposters = [],
    logLevel = 'info',
}: {
    port?: number;
    allowInjection?: boolean;
    imposters?: any[];
    logLevel?: 'info' | 'debug' | 'error';
}) => {
    const startOptions = {
        debug: false,
        allowInjection,
        'allow-injection': true,
        port,
        noParse: false,
        'no-parse': false,
        formatter: 'mountebank-formatters',
        pidfile: 'mb.pid',
        localOnly: false,
        'local-only': false,
        ipWhitelist: ['*'],
        'ip-whitelist': '*',
        mock: false,
        heroku: false,
        protofile: 'libs/testing/mock-provider/protocols.json',
        origin: false,
        log: {
            level: logLevel,
            transports: {
                console: { colorize: true, format: 'MockProvider: %level: %message' },
                file: { path: 'mb.log', format: 'json' },
            },
        },
    };
    const server = create(startOptions);

    for (const imposter of imposters) {
        const { port: imposterPort, protocol, schema, defaultStatusCode, stubs } = imposter;
    }

    return server;
};
