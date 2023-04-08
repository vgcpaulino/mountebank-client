import { startMountebank, addStub } from './index';

startMountebank({
    port: 2525,
    allowInjection: true,
    logLevel: 'debug',
    imposters: [
        {
            port: 7117,
            protocol: 'http',
            name: 'Example',
            stubs: [
                {
                    predicates: [
                        {
                            equals: {
                                path: '/hello',
                            },
                        },
                    ],
                    responses: [
                        {
                            is: {
                                body: 'Hello, world!',
                            },
                        },
                    ],
                },
            ],
        },
    ],
}).then(() => console.log('Mountebank Running!'));

setTimeout(() => {}, 5000);

addStub({
    stub: {
        predicates: [
            {
                equals: {
                    path: '/welcome',
                },
            },
        ],
        responses: [
            {
                is: {
                    body: 'Welcome!',
                },
            },
        ],
    },
}).then(() => console.log('Adding Stub!'));
