import { Imposter, LogLevel } from '../interfaces';
import { addImposter, addStub } from '../client/mountebankClient';
import { create } from 'mountebank/src/mountebank';
import { deleteService } from './deleteService';

export const startMountebank = async ({
    port = 2525,
    portDeleteService,
    allowInjection = true,
    imposters = [],
    logLevel = 'info',
}: {
    port?: number;
    portDeleteService?: number;
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

    if (portDeleteService) {
        deleteService({ port: portDeleteService, logLevel });
    }

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
