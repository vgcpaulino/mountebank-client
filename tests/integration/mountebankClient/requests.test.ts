import { http } from '../../helpers/http';
import { createClient, ImposterBuilder, MountebankError, StubBuilder } from '../../../src';
import { graphQLSchema } from '../../helpers/graphqlSchema';
import { testPort } from '../../config/ports';

const recordingPort = testPort(1122);
const silentPort = testPort(1123);
const graphqlPort = testPort(1124);
const mb = createClient();
const recording = mb.imposter(recordingPort);
const silent = mb.imposter(silentPort);

describe('Recorded requests', () => {
    beforeAll(async () => {
        await mb.createImposter(
            new ImposterBuilder({ port: recordingPort, protocol: 'http', recordRequests: true })
                .addStub(new StubBuilder().post('/orders').response({ status: 201, body: { id: 1 } }))
                .addDefaultResponse({ status: 200, body: 'ok' })
        );
        await mb.createImposter(new ImposterBuilder({ port: silentPort, protocol: 'http' }));
    });

    afterAll(async () => {
        await Promise.all([recordingPort, silentPort, graphqlPort].map((port) => mb.imposter(port).delete()));
    });

    beforeEach(async () => {
        await recording.clearRequests();
    });

    test('records what the app sent, with the JSON body parsed', async () => {
        await http.get(`http://localhost:${recordingPort}/orders?page=2`, { headers: { 'X-Request-Id': 'abc' } });
        await http.post(`http://localhost:${recordingPort}/orders`, { item: 'book', quantity: 2 });

        const requests = await recording.getRequests();

        expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /orders', 'POST /orders']);
        expect(requests[0].query).toEqual({ page: '2' });
        expect(requests[1].json).toEqual({ item: 'book', quantity: 2 });
        expect(requests[1].timestamp).toEqual(expect.any(String));
    });

    test('filters by method, path, headers, query and body', async () => {
        await http.post(`http://localhost:${recordingPort}/orders`, { item: 'book', quantity: 2 });
        await http.post(`http://localhost:${recordingPort}/orders`, { item: 'pen', quantity: 1 });
        await http.get(`http://localhost:${recordingPort}/orders?page=2`, { headers: { 'X-Request-Id': 'abc' } });

        const books = await recording.getRequests({ method: 'post', path: '/orders', body: { item: 'book' } });
        expect(books).toHaveLength(1);
        expect(books[0].json).toEqual({ item: 'book', quantity: 2 });

        expect(await recording.getRequests({ method: 'POST' })).toHaveLength(2);
        expect(await recording.getRequests({ headers: { 'x-request-id': 'abc' } })).toHaveLength(1);
        expect(await recording.getRequests({ query: { page: '2' } })).toHaveLength(1);
        expect(await recording.getRequests({ path: /^\/missing/ })).toEqual([]);
    });

    test('clearRequests forgets what was recorded', async () => {
        await http.get(`http://localhost:${recordingPort}/anything`);
        expect(await recording.getRequests()).toHaveLength(1);

        await recording.clearRequests();

        expect(await recording.getRequests()).toEqual([]);
    });

    test('an imposter that does not record returns [] until it receives a request, then throws', async () => {
        expect(await silent.getRequests()).toEqual([]);

        await http.get(`http://localhost:${silentPort}/anything`);

        const error = (await silent.getRequests().catch((e: unknown) => e)) as MountebankError;
        expect(error).toBeInstanceOf(MountebankError);
        expect(error.message).toContain(`received 1 request(s) but doesn't record them`);
        expect(error.message).toContain('recordRequests: true');
    });

    test('records GraphQL operations, filterable by operationName and args', async () => {
        const graphql = await mb.createImposter(
            new ImposterBuilder({
                port: graphqlPort,
                protocol: 'graphql',
                schema: graphQLSchema,
                recordRequests: true,
            }).addStub(
                new StubBuilder()
                    .any({ query: 'getUser', args: { id: 10 } })
                    .response({ status: 200, data: { id: 10 } })
            )
        );

        await http.post(`http://localhost:${graphqlPort}/`, { query: '{ getUser(id: 10) { id } }' });
        await http.post(`http://localhost:${graphqlPort}/`, { query: '{ getAllUsers { id } }' });

        const getUser = await graphql.getRequests({ operationName: 'getUser', args: { id: 10 } });
        expect(getUser).toHaveLength(1);
        expect(getUser[0].operationType).toBe('query');
        expect(await graphql.getRequests()).toHaveLength(2);
    });
});
