import { startMountebank } from './index';
import { imposterUsersService } from './imposters';

startMountebank({
    port: 2525,
    allowInjection: true,
    logLevel: 'info',
    imposters: [
        imposterUsersService,
    ],
}).then(() => console.log('Mountebank Running!'));
