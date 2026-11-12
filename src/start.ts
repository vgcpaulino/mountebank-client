import { startMountebank } from './index';

export default startMountebank({
    port: parseInt(process.env['MB_PORT'] || '') || 2525,
    allowInjection: true,
    logLevel: 'debug',
});
