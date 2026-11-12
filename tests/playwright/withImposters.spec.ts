import { expect, test as base } from '@playwright/test';
import { createClient, ImposterBuilder, StubBuilder } from '../../src';
import { withImposters } from '../../src/testing/playwright';
import { testPort } from '../config/ports';

const port = testPort(1151);
const imposter = createClient().imposter(port);
const api = new ImposterBuilder({ port, protocol: 'http', recordRequests: true }).addStub(
    new StubBuilder().get('/users/1').response({ status: 200, body: { id: 1 } })
);

const test = withImposters(base, [api]);

test('global setup started mountebank and the fixture created the imposter', async ({ request, imposters }) => {
    expect(process.env.MOUNTEBANK_URL).toBe(`http://localhost:${testPort(2545)}`);
    expect(imposters).toEqual([api]);

    expect(await (await request.get(`http://localhost:${port}/users/1`)).json()).toEqual({ id: 1 });
    await imposter.addStub(new StubBuilder().get('/extra').response({ status: 200, body: 'extra' }));
    expect(await imposter.getRequests()).toHaveLength(1);
});

test('each test starts from the definition again', async ({ request }) => {
    expect(await imposter.getRequests()).toEqual([]);
    // The extra stub from the previous test is gone: no stub matches, so mountebank's empty default answers.
    expect(await (await request.get(`http://localhost:${port}/extra`)).text()).toBe('');
});
