import axios from 'axios';
import { clearRequests, deleteImposter, getRequests, ImposterBuilder, MountebankError, StubBuilder } from '../../../src';
import { graphQLSchema } from '../../helpers/graphqlSchema';
import { testPort } from '../../config/ports';

const recordingPort = testPort(1122);
const silentPort = testPort(1123);
const graphqlPort = testPort(1124);

describe('Recorded requests', () => {
    beforeAll(async () => {
        await new ImposterBuilder({ port: recordingPort, protocol: 'http', recordRequests: true })
            .addStub(new StubBuilder().post('/orders').response({ status: 201, body: { id: 1 } }))
            .addDefaultResponse({ status: 200, body: 'ok' })
            .addImposter();
        await new ImposterBuilder({ port: silentPort, protocol: 'http' }).addImposter();
    });

    afterAll(async () => {
        await Promise.all([recordingPort, silentPort, graphqlPort].map((port) => deleteImposter({ port })));
    });

    beforeEach(async () => {
        await clearRequests({ imposterPort: recordingPort });
    });

    test('records what the app sent, with the JSON body parsed', async () => {
        await axios.get(`http://localhost:${recordingPort}/orders?page=2`, { headers: { 'X-Request-Id': 'abc' } });
        await axios.post(`http://localhost:${recordingPort}/orders`, { item: 'book', quantity: 2 });

        const requests = await getRequests({ imposterPort: recordingPort });

        expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /orders', 'POST /orders']);
        expect(requests[0].query).toEqual({ page: '2' });
        expect(requests[1].json).toEqual({ item: 'book', quantity: 2 });
        expect(requests[1].timestamp).toEqual(expect.any(String));
    });

    test('filters by method, path, headers, query and body', async () => {
        await axios.post(`http://localhost:${recordingPort}/orders`, { item: 'book', quantity: 2 });
        await axios.post(`http://localhost:${recordingPort}/orders`, { item: 'pen', quantity: 1 });
        await axios.get(`http://localhost:${recordingPort}/orders?page=2`, { headers: { 'X-Request-Id': 'abc' } });

        const books = await getRequests({
            imposterPort: recordingPort,
            filter: { method: 'post', path: '/orders', body: { item: 'book' } },
        });
        expect(books).toHaveLength(1);
        expect(books[0].json).toEqual({ item: 'book', quantity: 2 });

        expect(await getRequests({ imposterPort: recordingPort, filter: { method: 'POST' } })).toHaveLength(2);
        expect(
            await getRequests({ imposterPort: recordingPort, filter: { headers: { 'x-request-id': 'abc' } } })
        ).toHaveLength(1);
        expect(await getRequests({ imposterPort: recordingPort, filter: { query: { page: '2' } } })).toHaveLength(1);
        expect(await getRequests({ imposterPort: recordingPort, filter: { path: /^\/missing/ } })).toEqual([]);
    });

    test('clearRequests forgets what was recorded', async () => {
        await axios.get(`http://localhost:${recordingPort}/anything`);
        expect(await getRequests({ imposterPort: recordingPort })).toHaveLength(1);

        await clearRequests({ imposterPort: recordingPort });

        expect(await getRequests({ imposterPort: recordingPort })).toEqual([]);
    });

    test('an imposter that does not record returns [] until it receives a request, then throws', async () => {
        expect(await getRequests({ imposterPort: silentPort })).toEqual([]);

        await axios.get(`http://localhost:${silentPort}/anything`, { validateStatus: null });

        const error = await getRequests({ imposterPort: silentPort }).catch((e) => e);
        expect(error).toBeInstanceOf(MountebankError);
        expect(error.message).toContain(`received 1 request(s) but doesn't record them`);
        expect(error.message).toContain('recordRequests: true');
    });

    test('records GraphQL operations, filterable by operationName and args', async () => {
        await new ImposterBuilder({ port: graphqlPort, protocol: 'graphql', schema: graphQLSchema, recordRequests: true })
            .addStub(new StubBuilder().any({ query: 'getUser', args: { id: 10 } }).response({ status: 200, data: { id: 10 } }))
            .addImposter();

        await axios.post(`http://localhost:${graphqlPort}/`, { query: '{ getUser(id: 10) { id } }' });
        await axios.post(`http://localhost:${graphqlPort}/`, { query: '{ getAllUsers { id } }' });

        const getUser = await getRequests({ imposterPort: graphqlPort, filter: { operationName: 'getUser', args: { id: 10 } } });
        expect(getUser).toHaveLength(1);
        expect(getUser[0].operationType).toBe('query');
        expect(await getRequests({ imposterPort: graphqlPort })).toHaveLength(2);
    });
});
