import { startMountebank, addStub, ImposterBuilder, ResponseBuilder, PredicateBuilder, StubBuilder } from './index';

startMountebank({
    port: 2525,
    allowInjection: true,
    logLevel: 'debug',
    imposters: [
        new ImposterBuilder({ port: 7117, protocol: 'http', name: 'Example' })
            .addDefaultReponse({
                status: 404,
                body: 'Not Found!',
            })
            .addStub(
                new StubBuilder()
                    .addPredicate(new PredicateBuilder({ operator: 'equals', path: '/hello' }).generate())
                    .addResponse(new ResponseBuilder({ status: 200, body: 'Hello, world!' }).generate())
            )
            .generate(),
    ],
}).then(() => console.log('Mountebank Running!'));

setTimeout(() => {}, 5000);

const stub = new StubBuilder().get('/welcome').response({ status: 200, body: { message: 'Welcome!' } });
addStub({ stub }).then(() => console.log('Adding Stub!'));
