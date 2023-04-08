import { startMountebank } from './index';

startMountebank({
    port: 2525,
    allowInjection: true,
    logLevel: 'debug',
    imposters: [{
        port: 7117,
        protocol: 'http',
        name: 'Example'
    }]
}).then(() => console.log('Mountebank Running!'));
