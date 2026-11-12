# Mountebank Client

A TypeScript client for Mountebank API that provides a fluent interface for creating and managing mock services.

## Installation
```sh
npm install mountebank-client
```

## Usage
```ts
import { startMountebank, StubBuilder, ImposterBuilder } from 'mountebank-client';

const stub = new StubBuilder().get('/welcome').response({
    status: 200,
    body: { 
        message: 'Welcome!' 
    }
});

const imposter = new ImposterBuilder({
    port: 7117,
    protocol: 'http',
    name: 'Example API'
}).addStub(stub);

startMountebank({
    port: 2525,
    imposters: [imposter]
}).then(() => console.log('Mountebank Running!'));
```
See the [examples](./examples) directory for more usage examples.
