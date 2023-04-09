import { startMountebank, addStub, ResponseBuilder, PredicateBuilder } from './index';

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
                    predicates: [new PredicateBuilder({ operator: 'equals', path: '/hello' }).generate()],
                    responses: [new ResponseBuilder({ status: 200, body: 'Hello, world!' }).generate()],
                },
            ],
        },
    ],
}).then(() => console.log('Mountebank Running!'));

setTimeout(() => {}, 5000);

addStub({
    stub: {
        predicates: [new PredicateBuilder({ operator: 'equals', method: 'GET', path: '/welcome' }).generate()],
        responses: [new ResponseBuilder({ status: 200, body: { message: 'Welcome!' } }).generate()],
    },
}).then(() => console.log('Adding Stub!'));
