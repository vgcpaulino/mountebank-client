import { startMountebank } from './index';

export default startMountebank({
    port: 2525,
    portDeleteService: 2526,
    allowInjection: true,
    logLevel: 'error',
});
