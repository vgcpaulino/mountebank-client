import { startMountebank } from './index';

export default startMountebank({
    port: 2525,
    allowInjection: true,
    logLevel: 'debug',
});
