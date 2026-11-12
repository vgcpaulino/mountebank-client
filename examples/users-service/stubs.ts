import { Config, createClient, StubBuilder } from '../../src';
import { UserBuilder } from './userBuilder';

export const stubGetUserProxy = new StubBuilder().get('/users/me').proxyResponse({ url: 'http://live.com' });

export const stubPatchUserProxy = new StubBuilder()
    .patch('/users', { operator: 'startsWith' })
    .proxyResponse({ url: 'http://live.com' });

export const stubGetUser = new StubBuilder().get('/users/me').response({
    status: 200,
    body: new UserBuilder({ id: 999 }).generate(),
    // Decorate functions are serialized and run inside mountebank,
    // so they must not reference anything outside their own body.
    decorate: (config: Config) => {
        config.state.responses ??= {};
        config.state.responses.users ??= {};
        const users = config.state.responses.users;

        const userId = config.response.body?.id;
        if (userId === undefined) {
            return;
        }

        if (users[userId]) {
            config.response.body = users[userId];
        } else {
            users[userId] = config.response.body;
        }
    },
});

export const stubPatchUser = new StubBuilder().patch('/users', { operator: 'startsWith' }).response({
    status: 200,
    body: {},
    decorate: (config: Config) => {
        config.state.responses ??= {};
        config.state.responses.users ??= {};
        const users = config.state.responses.users;

        const userId = config.request.path.substring(config.request.path.lastIndexOf('/') + 1);

        let userUpdates: Record<string, unknown>;
        try {
            userUpdates = config.request.body ? JSON.parse(config.request.body) : {};
        } catch {
            config.response.statusCode = 400;
            config.response.body = { message: 'Request body must be valid JSON' };
            return;
        }

        const newUserData = {
            ...users[userId],
            ...userUpdates,
        };

        users[userId] = newUserData;
        config.response.body = newUserData;
    },
});

/** Adds the users stubs to the users-service imposter (port 8080) on the server in MOUNTEBANK_URL. */
export async function addUserStubs() {
    await createClient().imposter(8080).addStubs([stubGetUser, stubPatchUser]);
}
