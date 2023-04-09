import { startMountebank, addStub, ResponseBuilder } from './index';

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
                    responses: [new ResponseBuilder({ status: 200, body: 'Hello, world!' }).generate()],
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
        responses: [new ResponseBuilder({ status: 200, body: { message: 'Welcome!' } }).generate()],
    },
}).then(() => console.log('Adding Stub!'));
