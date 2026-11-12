---
name: mountebank-setup
description: Run a mountebank server for tests that use the mountebank-client package and connect the client to it. Covers Docker, the mb CLI, starting mountebank in-process with startMountebank, the MOUNTEBANK_URL setting, the Jest and Playwright helpers (jestGlobalSetup, useImposters, playwrightGlobalSetup, withImposters), setupMountebank and resetImposters for other runners, keeping tests isolated, and troubleshooting connection refused, remote connections, port conflicts, stubs on the wrong port and disabled injection. Use when setting up or debugging the test infrastructure around mountebank-client.
---

# Running mountebank for mountebank-client

The client needs a running mountebank server. It never starts one by itself, except through `startMountebank` /
`setupMountebank` from `mountebank-client/server`, which need `@mbtest/mountebank` installed (it's an optional peer
dependency: `npm install --save-dev @mbtest/mountebank`, plus `mb-graphql` for GraphQL imposters).

## 1. Pick how to run the server

| Option         | Use when                                              | Command / code                                                |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| Docker         | CI, or you don't want mountebank in `node_modules`    | `docker run --rm -p 2525:2525 -p 8080:8080 bbyars/mountebank:2.9.5 start --allowInjection` |
| `mb` CLI       | local dev, Jest / Playwright spawning a process       | `npx mb start --allowInjection` (needs `@mbtest/mountebank`)  |
| In-process     | a plain Node script or a dev mock server              | `await startMountebank({ port: 2525, imposters })` from `mountebank-client/server` |

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

The package ships helpers for both runners. They start mountebank **in the runner's main process** during global
setup (which needs `@mbtest/mountebank` installed), or wait for an external server with `url`. They point `MOUNTEBANK_URL` at it for the workers, and reset your
imposters before each test.

### Jest

```js
// jest.global-setup.js
module.exports = require('mountebank-client/jest').jestGlobalSetup({ port: 2525 });

// jest.global-teardown.js
module.exports = require('mountebank-client/jest').jestGlobalTeardown();

// jest.config.js
module.exports = { globalSetup: './jest.global-setup.js', globalTeardown: './jest.global-teardown.js' };
```

In each test file, declare its imposters once; `useImposters` creates them before the file's tests, recreates them
before **each** test, and deletes them after the file:

```ts
import { ImposterBuilder, StubBuilder } from 'mountebank-client';
import { useImposters } from 'mountebank-client/jest';

const usersApi = new ImposterBuilder({ port: 8080, protocol: 'http', recordRequests: true })
    .addStub(new StubBuilder().get('/users/1').response({ status: 200, body: { id: 1 } }));

useImposters([usersApi]); // { resetBeforeEach: false } to create them once per file

test('...', async () => { /* stubs added here are gone in the next test */ });
```

- Jest runs files in parallel, so give each file its own imposter ports.
- Never call `startMountebank` (or `setupMountebank`) **inside a test file**: mountebank pulls in ES-module-only
  packages that Jest's module system can't load. Global setup runs in plain Node, so it works there.

### Playwright

```ts
// mountebank.setup.ts, with globalSetup: require.resolve('./mountebank.setup.ts') in playwright.config.ts
import { playwrightGlobalSetup } from 'mountebank-client/playwright';
export default playwrightGlobalSetup({ port: 2525 });
```

```ts
import { test as base, expect } from '@playwright/test';
import { withImposters } from 'mountebank-client/playwright';

const test = withImposters(base, [usersApi]); // recreates usersApi before each test

test('shows the user', async ({ page }) => {
    await page.goto('http://localhost:3000/users/1'); // the app under test calls http://localhost:8080
    await expect(page.getByText('Ada')).toBeVisible();
});
```

- Imposters sit on fixed ports the app calls, so tests sharing them must not run at the same time: `workers: 1` in
  `playwright.config.ts`, or `test.describe.configure({ mode: 'serial' })`.
- Use `allowCORS: true` on imposters the browser calls directly.

### Any other runner

The same building blocks, from `mountebank-client`:

```ts
import { resetImposters, waitForMountebank } from 'mountebank-client';
import { setupMountebank } from 'mountebank-client/server';

const mb = await setupMountebank({ port: 2525, imposters: [usersApi] }); // or { url: 'http://localhost:2525' }
await resetImposters([usersApi]); // before each test: recreate just these imposters
await mb.stop();                  // after the run
await waitForMountebank({ url: 'http://localhost:2525' }); // e.g. for a Docker server started elsewhere
```

With `url`, setup uses that server and `stop()` deletes only the imposters it created.

### In-process (plain Node)

```ts
import { ImposterBuilder, StubBuilder } from 'mountebank-client';
import { startMountebank } from 'mountebank-client/server';

const imposter = new ImposterBuilder({ port: 8080, protocol: 'http' })
    .addStub(new StubBuilder().get('/health').response({ status: 200, body: { ok: true } }));

const server = await startMountebank({ port: 2525, imposters: [imposter], allowInjection: true, logLevel: 'info' });
// ...
await new Promise<void>((resolve) => server.close(resolve)); // also stops all imposters
```

Defaults to know:

- Only this machine can connect: mountebank and the HTTP/HTTPS imposters listen on `127.0.0.1`. Pass
  `allowRemoteConnections: true` when a container, VM or another host has to call them. GraphQL imposters always
  listen on every interface (mb-graphql doesn't support choosing one).
- The log that `getLogs()` reads goes to a file in the system temp folder, not your project. `logFile: '<path>'`
  picks the file; `logFile: false` writes none (then `getLogs()` has nothing to return).
- It reads `./protocols.json` (relative to the working directory) for the GraphQL protocol.
- `@mbtest/mountebank` must be installed (it isn't installed with mountebank-client). Without it, starting throws
  "Starting mountebank in-process needs '@mbtest/mountebank', which isn't installed" with the install command.
  With `url`, `setupMountebank` uses an existing server and doesn't need it.

## 4. Keep tests isolated

- The simplest isolation: `useImposters` (Jest), `withImposters` (Playwright) or `resetImposters` (any runner) before
  each test. Recreating the imposters removes stubs added by the previous test, its recorded requests and its
  `decorate` state, and only touches those imposters' ports.
- One imposter port per test file. Jest and Playwright run files in parallel; files that share an imposter share its
  stubs.
- Imposters you create live until you delete them or the server stops. Creating one on a port that is still in use
  throws, so either `deleteImposter({ port })` first or keep it for the whole run.
- To start a run (or a test file, when files don't run in parallel) from a clean server, call `deleteImposters()`.
  Don't call it while other test files share the same server: it removes their imposters too.
- Without those helpers: recorded requests accumulate (`clearRequests({ imposterPort })` in `beforeEach`, see
  **mountebank-requests**), per-test stubs stay (`await stub.deleteStub()` in `afterEach`), and `config.state` used
  by `decorate` survives until the imposter is recreated.

## 5. Troubleshooting

| Symptom                                                  | Likely cause and fix                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| "Starting mountebank in-process needs '@mbtest/mountebank'" | Install it: `npm install --save-dev @mbtest/mountebank` (and `mb-graphql` for GraphQL). Or use an external server (`url`). |
| `MountebankError` "can't reach mountebank at … (ECONNREFUSED)" | Server not started, or still starting. Start it in global setup (`jestGlobalSetup` / `playwrightGlobalSetup`), or `waitForMountebank` for an external one. |
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
