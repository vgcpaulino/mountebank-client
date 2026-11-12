// Users-service demo: starts mountebank with one imposter on port 8080 that fakes GET /users/me and
// PATCH /users/:id, keeping the user in imposter state. Run it with `yarn start:dev`.
import { startMountebank } from '../../src/server';
import { imposterUsersService } from './imposters';

startMountebank({
    port: 2525,
    allowInjection: true,
    logLevel: 'info',
    imposters: [imposterUsersService],
}).then(() => console.log('Mountebank running: users service on http://localhost:8080'));
