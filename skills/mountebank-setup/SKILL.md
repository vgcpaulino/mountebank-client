---
name: mountebank-setup
description: Run a mountebank server for tests that use the mountebank-client package and connect the client to it. Covers Docker, the mb CLI, starting mountebank in-process with startMountebank, the MOUNTEBANK_URL setting, Jest global setup, Playwright webServer, keeping tests isolated, and troubleshooting connection refused, remote connections, port conflicts, stubs on the wrong port and disabled injection. Use when setting up or debugging the test infrastructure around mountebank-client.
---

# Running mountebank for mountebank-client

The client needs a running mountebank server. It never starts one by itself, except through `startMountebank`.

## 1. Pick how to run the server

| Option         | Use when                                              | Command / code                                                |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| Docker         | CI, or you don't want mountebank in `node_modules`    | `docker run --rm -p 2525:2525 -p 8080:8080 bbyars/mountebank:2.9.5 start --allowInjection` |
| `mb` CLI       | local dev, Jest / Playwright spawning a process       | `npx mb start --allowInjection` (needs `@mbtest/mountebank`)  |
| In-process     | a plain Node script or a dev mock server              | `await startMountebank({ port: 2525, imposters })`            |

Notes:

- With Docker, **publish every imposter port** too (`-p 8080:8080` above), not only 2525.
- `--allowInjection` is required for `decorate` functions (see **mountebank-decorate**). Without it, mountebank
  rejects any stub that uses `decorate` with a 400 ("JavaScript injection is not allowed unless mb is run with the
  --allowInjection flag"), and `StubBuilder.addStub()` / `ImposterBuilder.addImposter()` throw a `MountebankError`
  with that message. Only enable injection on servers that untrusted networks can't
  reach, because it runs arbitrary JavaScript.
- `chaos` works on any mountebank version because, by default, it's implemented as an injected `decorate`, so it
  also needs `--allowInjection`. Only `chaos: { implementation: 'native' }` needs mountebank 2.9.6+ (not released
  yet; the mountebank this package installs is the latest stable, 2.9.5).
- The npm package is `@mbtest/mountebank`. The old `mountebank` package stopped at 2.9.1; don't install it.

## 2. Point the client at the server

The client reads `MOUNTEBANK_URL` (default `http://localhost:2525`) **once, when the module is first imported**.
The builders (`ImposterBuilder.addImposter()`, `StubBuilder.addStub()`) have no URL option, so for a server that
isn't on `localhost:2525`:

- set `MOUNTEBANK_URL` in the environment **before** the test process imports `mountebank-client` (in Jest,
  `process.env` set in `globalSetup` is inherited by the workers), or
- call the lower-level functions with `providerUrl`: `addImposter({ providerUrl, ... })`, `addStub({ providerUrl,
  imposterPort, stub })`, `getImposter({ providerUrl, port })`, `getLogs({ providerUrl })`.

`MOUNTEBANK_IMPOSTER_DEFAULT_PORT` (default `7117`) is the port used when a stub or imposter is added without one.
Always pass ports explicitly instead of relying on it.

## 3. Wire it into the test runner

### Jest

Don't call `startMountebank` inside Jest (test files or `globalSetup`): it loads mountebank, which pulls in
ES-module-only packages that Jest's module system can't load. Importing `mountebank-client` is fine; mountebank is
only loaded when `startMountebank` runs. Run mountebank as a separate process from `globalSetup` instead, e.g. with
`jest-dev-server`:

```ts
// jest.global-setup.ts
import { setup } from 'jest-dev-server';

module.exports = async () => {
    process.env['MOUNTEBANK_URL'] = 'http://localhost:2525';
    globalThis.servers = await setup({ command: 'npx mb start --allowInjection', port: 2525, launchTimeout: 30000 });
};

// jest.global-teardown.ts
import { teardown } from 'jest-dev-server';
module.exports = async () => teardown(globalThis.servers);
```

```js
// jest.config.js
module.exports = { globalSetup: './jest.global-setup.ts', globalTeardown: './jest.global-teardown.ts' };
```

Then create imposters in `beforeAll` and remove per-test stubs in `afterEach` (see isolation below).

### Playwright

Let Playwright start the server, and create imposters/stubs from the tests or a global setup:

```ts
// playwright.config.ts
export default defineConfig({
    webServer: [
        { command: 'npx mb start --allowInjection', port: 2525, reuseExistingServer: !process.env.CI },
        // { command: 'npm run dev', port: 3000 }, // the app under test, configured to call http://localhost:8080
    ],
});
```

```ts
test.beforeAll(async () => {
    await new ImposterBuilder({ port: 8080, protocol: 'http', allowCORS: true })
        .addDefaultResponse({ status: 404, body: { error: 'no stub matched' } })
        .addImposter();
});
```

Use `allowCORS: true` when the browser calls the imposter directly.

### In-process (plain Node)

```ts
import { ImposterBuilder, StubBuilder, startMountebank } from 'mountebank-client';

const imposter = new ImposterBuilder({ port: 8080, protocol: 'http' })
    .addStub(new StubBuilder().get('/health').response({ status: 200, body: { ok: true } }));

const server = await startMountebank({ port: 2525, imposters: [imposter], allowInjection: true, logLevel: 'info' });
// ...
await new Promise<void>((resolve) => server.close(resolve));
```

Defaults to know:

- Only this machine can connect: mountebank and the HTTP/HTTPS imposters listen on `127.0.0.1`. Pass
  `allowRemoteConnections: true` when a container, VM or another host has to call them. GraphQL imposters always
  listen on every interface (mb-graphql doesn't support choosing one).
- The log that `getLogs()` reads goes to a file in the system temp folder, not your project. `logFile: '<path>'`
  picks the file; `logFile: false` writes none (then `getLogs()` has nothing to return).
- It reads `./protocols.json` (relative to the working directory) for the GraphQL protocol.
- `@mbtest/mountebank` must be installed for it to work.

## 4. Keep tests isolated

- One imposter port per test file. Jest and Playwright run files in parallel; files that share an imposter share its
  stubs.
- Imposters you create live until you delete them or the server stops. Creating one on a port that is still in use
  throws, so either `deleteImposter({ port })` first or keep it for the whole run.
- To start a run (or a test file, when files don't run in parallel) from a clean server, call `deleteImposters()`.
  Don't call it while other test files share the same server: it removes their imposters too.
- Recorded requests accumulate: `clearRequests({ imposterPort })` in `beforeEach` (see **mountebank-requests**).
- Per-test stubs: create them in the test, `await stub.deleteStub()` in `afterEach`.
- `config.state` used by `decorate` lives on the imposter and survives between tests. Reset it by recreating the
  imposter.

## 5. Troubleshooting

| Symptom                                                  | Likely cause and fix                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `ECONNREFUSED ...:2525`                                  | Server not started, or still starting. Wait for the port (jest-dev-server / `webServer`).   |
| `ECONNREFUSED ...:<imposter port>`                       | Imposter never created, or (Docker) its port isn't published.                              |
| `addStub()` works but requests don't match it            | A stub created on its own went to port 7117: pass `imposterPort`. Or a broader stub earlier in the list wins. |
| `ECONNREFUSED` / blocked connection from a container or other host | `startMountebank` accepts only local connections by default: pass `allowRemoteConnections: true`. |
| `200` with an empty body                                 | No stub matched and there's no default response. Add `addDefaultResponse()`.               |
| "JavaScript injection is not allowed" / imposter with `decorate` or `chaos` missing | Server started without `--allowInjection`.                      |
| `Unrecognized behavior: "chaos"`                         | `implementation: 'native'` on mountebank older than 2.9.6. Drop the option.               |
| `decorate` stub answers 500 / log shows `injection X=>`  | The function throws or uses outer variables (see **mountebank-decorate**).        |
| `MountebankError` "no stub with ID …"                    | The stub was already deleted, or the imposter was recreated. Delete each stub once.        |
| `MountebankError` "… received N request(s) but doesn't record them" | The imposter was created without `recordRequests: true`; recreate it with recording on. |
| `MountebankError` "port … is already in use"             | An imposter already exists on that port: `deleteImposter({ port })` first, or use another. |
| `EADDRINUSE` when starting mountebank                    | Another mountebank (or other process) on 2525. Stop it, or use different ports.            |

Two calls answer most questions:

```ts
import { getImposter, getLogs } from 'mountebank-client';
console.log(JSON.stringify(await getImposter({ port: 8080 }), null, 2)); // what stubs exist, in which order
console.log(await getLogs());                                            // matches, errors, injection failures
```

You can also open `http://localhost:2525/imposters/<port>` in a browser.
