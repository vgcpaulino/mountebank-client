import { ImposterBuilder, StubBuilder } from '../builders';

const stubWithEndsWith = new StubBuilder()
    .get('/path/endsWith', { operator: 'endsWith' })
    .response({ status: 200, body: 'Work!' });

const stubWithStartsWith = new StubBuilder()
    .get('/startsWith', { operator: 'startsWith' })
    .response({ status: 200, body: 'Work!' });

export const imposter = new ImposterBuilder({ port: 7117, protocol: 'http', name: 'Imposter HTTP' })
    .addDefaultReponse({
        status: 404,
        body: 'Not Found!',
    })
    .addStub(stubWithEndsWith)
    .addStub(stubWithStartsWith);
