import { ImposterBuilder, StubBuilder } from '../../../src';

describe("ImposterBuilder - ties stubs to the imposter's port", () => {
    test('addStub gives a StubBuilder without a port the imposter port', () => {
        const stub = new StubBuilder().get('/a').response({ status: 200 });
        new ImposterBuilder({ port: 8080, protocol: 'http' }).addStub(stub);

        expect(stub.imposterPort).toBe(8080);
    });

    test('addStubs does the same for every stub', () => {
        const a = new StubBuilder().get('/a').response({ status: 200 });
        const b = new StubBuilder().get('/b').response({ status: 200 });
        const imposter = new ImposterBuilder({ port: 8081, protocol: 'http' }).addStubs([a, b]);

        expect([a.imposterPort, b.imposterPort]).toEqual([8081, 8081]);
        expect(imposter.stubs).toEqual([a, b]);
    });

    test('keeps a port the stub was given explicitly', () => {
        const stub = new StubBuilder({ imposterPort: 9000 }).get('/a').response({ status: 200 });
        new ImposterBuilder({ port: 8080, protocol: 'http' }).addStub(stub);

        expect(stub.imposterPort).toBe(9000);
    });

    test('a stub shared by two imposters keeps the first one', () => {
        const stub = new StubBuilder().get('/a').response({ status: 200 });
        new ImposterBuilder({ port: 8080, protocol: 'http' }).addStub(stub);
        new ImposterBuilder({ port: 8082, protocol: 'http' }).addStub(stub);

        expect(stub.imposterPort).toBe(8080);
    });
});
