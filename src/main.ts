import {
    startMountebank,
    addStub,
    ImposterBuilder,
    ResponseBuilder,
    PredicateBuilder,
    StubBuilder,
    Config,
} from './index';

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
                    .addResponse(new ResponseBuilder({ status: 200, body: 'Hello, world!', wait: 2000 }).generate())
            )
            .generate(),
    ],
}).then(() => console.log('Mountebank Running!'));

setTimeout(() => {}, 5000);

const decorateFunction = (config: Config) => {
    config.logger.info('############## HERE!');
};
const stub = new StubBuilder()
    .get('/welcome')
    .response({ status: 200, body: { message: 'Welcome!' }, repeat: 1 })
    .response({ status: 200, body: { message: 'Welcome 2!' }, repeat: 9999 });

const stubDecorateFunction = new StubBuilder()
    .get('/decorateFunction')
    .response({ status: 200, body: { message: 'Welcome!' }, decorate: decorateFunction });

const stubDecorateFunctionArr = new StubBuilder()
    .get('/decorateFunctionArr')
    .response({ status: 200, body: { message: 'Welcome!' }, decorate: [decorateFunction, decorateFunction] });

const stubDecorateStr = new StubBuilder().get('/decorateStr').response({
    status: 200,
    body: { message: 'Welcome!' },
    decorate: '(config) => { config.logger.info("###### Decorate String"); }',
});

const stubDecorateStrArr = new StubBuilder().get('/decorateStrArr').response({
    status: 200,
    body: { message: 'Welcome!' },
    decorate: [
        '(config) => { config.logger.info("###### Decorate String"); }',
        '(config) => { config.logger.info("###### Decorate String"); }',
    ],
});

addStub({ stub }).then(() => console.log('Adding Stub!'));
addStub({ stub: stubDecorateFunction }).then(() => console.log('Adding Stub!'));
addStub({ stub: stubDecorateFunctionArr }).then(() => console.log('Adding Stub!'));
addStub({ stub: stubDecorateStr }).then(() => console.log('Adding Stub!'));
addStub({ stub: stubDecorateStrArr }).then(() => console.log('Adding Stub!'));
