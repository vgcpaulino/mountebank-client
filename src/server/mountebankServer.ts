import { Imposter, LogLevel } from '../interfaces';
import { addImposter, addStub } from '../client/mountebankClient';
import { create } from 'mountebank/src/mountebank';

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
    const server = create(startOptions);

    for (const imposter of imposters) {
        const { port: imposterPort, protocol, schema, stubs } = imposter;

        // TODO: Mock-Provider: Implement a function to add all imposters in a single request;
        await addImposter({
            providerUrl: `http://localhost:${port}`,
            port: imposterPort,
            protocol,
            schema,
            stubs,
        });
    }

    return server;
};
