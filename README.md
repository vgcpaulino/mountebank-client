# mountebank-client

Fluent TypeScript builders for [mountebank](https://www.mbtest.dev/), so you can fake HTTP and GraphQL APIs in your
tests without writing mountebank's JSON by hand.

```ts
new StubBuilder().get('/users/42').response({ status: 200, body: { id: 42, name: 'Ada' } });
```

That one line produces the stub mountebank expects:

```json
{
    "predicates": [{ "equals": { "method": "GET", "path": "/users/42" } }],
    "responses": [
        {
            "is": {
                "statusCode": 200,
                "headers": { "content-type": "application/json" },
                "body": { "id": 42, "name": "Ada" }
            }
        }
    ]
}
```

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Using a mountebank server you already run](#using-a-mountebank-server-you-already-run)
- [Imposters](#imposters)
- [Stubs: matching requests](#stubs-matching-requests)
- [Stubs: responses](#stubs-responses)
- [Behaviors](#behaviors)
- [Test runner setup](#test-runner-setup)
- [Verifying requests](#verifying-requests)
- [Managing imposters](#managing-imposters)
- [GraphQL](#graphql)
- [Low-level client functions](#low-level-client-functions)
- [Skills for AI coding agents](#skills-for-ai-coding-agents)
- [Development](#development)

## Requirements

- **Node.js 20.19 or later.** This is mountebank's own minimum.
- **A mountebank server.** Either let this package start one inside your Node process
  ([Quick start](#quick-start)), or point it at one you run yourself
  ([below](#using-a-mountebank-server-you-already-run)).

## Installation

```sh
npm install --save-dev mountebank-client
```

This also installs mountebank itself ([`@mbtest/mountebank`](https://www.npmjs.com/package/@mbtest/mountebank)), so
you can start a server without installing anything else.

## Quick start

Start mountebank, then create an imposter (a fake server on its own port) with a stub on it:

```ts
import { startMountebank, ImposterBuilder, StubBuilder } from 'mountebank-client';

const welcome = new StubBuilder().get('/welcome').response({
    status: 200,
    body: { message: 'Welcome!' },
});

const usersApi = new ImposterBuilder({ port: 7117, protocol: 'http', name: 'Users API' })
    .addDefaultResponse({ status: 404, body: { message: 'Not found' } })
    .addStub(welcome);

await startMountebank({ port: 2525, imposters: [usersApi] });

// GET http://localhost:7117/welcome → 200 { "message": "Welcome!" }
// GET http://localhost:7117/anything-else → 404 { "message": "Not found" }
```

`startMountebank` options:

| Option           | Default  | Description                                                                 |
| ---------------- | -------- | --------------------------------------------------------------------------- |
| `port`           | `2525`   | Port for mountebank's own API.                                              |
| `imposters`      | `[]`     | Imposters to create once the server is listening.                           |
| `allowInjection` | `true`   | Lets mountebank run JavaScript you send it. Needed for `decorate`.          |
| `logLevel`       | `'info'` | `'debug'`, `'info'`, `'warn'` or `'error'`.                                 |
| `logFile`        | a file in the system temp folder | Where mountebank writes the log that `getLogs()` reads. A path, or `false` for no log file. Nothing is written into your project. |
| `allowRemoteConnections` | `false` | Accept connections from other machines. By default mountebank and the HTTP/HTTPS imposters listen on `127.0.0.1` only; turn it on when, e.g., a container or another host calls the imposters. (GraphQL imposters always listen on every interface.) |

You can also add stubs to an imposter that's already running:

```ts
const stub = new StubBuilder({ imposterPort: 7117 }).get('/health').response({ status: 200, body: 'OK' });

await stub.addStub();
// ...later
await stub.deleteStub();
```

## Using a mountebank server you already run

If mountebank already runs elsewhere (installed globally, in Docker, on another machine), skip `startMountebank` and
tell the client where it is:

| Environment variable                | Default                 | Description                                        |
| ----------------------------------- | ----------------------- | -------------------------------------------------- |
| `MOUNTEBANK_URL`                    | `http://localhost:2525` | Where mountebank's API is.                         |
| `MOUNTEBANK_IMPOSTER_DEFAULT_PORT`  | `7117`                  | Imposter port used when a call doesn't give one.   |

```sh
npm install -g @mbtest/mountebank
mb --allowInjection
```

```ts
import { ImposterBuilder, StubBuilder } from 'mountebank-client';

await new ImposterBuilder({ port: 7117, protocol: 'http' })
    .addStub(new StubBuilder().get('/welcome').response({ status: 200, body: 'Hi' }))
    .addImposter();
```

> **Tip:** a stub added to an `ImposterBuilder` remembers that imposter's port, so a later `stub.deleteStub()` (or
> `stub.addStub()`) goes to the right imposter. A stub you create on its own and add with `stub.addStub()` needs
> `new StubBuilder({ imposterPort })`; without it, it goes to the default port (7117).

## Imposters

```ts
new ImposterBuilder({
    port: 7117,
    protocol: 'http',      // 'http', 'https' or 'graphql'
    name: 'Users API',     // optional, shown in mountebank's UI and logs
    allowCORS: true,       // optional: answer CORS preflight requests automatically
})
    .addDefaultResponse({ status: 404, headers: { 'x-mock': 'true' }, body: 'Not found' })
    .addStub(stubA)
    .addStubs([stubB, stubC]);
```

- `addDefaultResponse` sets what the imposter returns when no stub matches.
- `addImposter()` sends the imposter to mountebank. `startMountebank({ imposters })` does this for you.

## Stubs: matching requests

A stub matches requests with one method per HTTP verb:

```ts
new StubBuilder().get('/users');
new StubBuilder().post('/users');
new StubBuilder().put('/users/1');
new StubBuilder().patch('/users/1');
new StubBuilder().delete('/users/1');
new StubBuilder().options('/users');
```

By default the path must match exactly. Pass an `operator` to match differently:

| Operator       | Matches when the request path…                 |
| -------------- | ----------------------------------------------- |
| `'equals'`     | is exactly the given path (default)            |
| `'startsWith'` | starts with it                                  |
| `'endsWith'`   | ends with it                                    |
| `'contains'`   | contains it                                     |
| `'matches'`    | matches it as a regular expression             |

```ts
new StubBuilder().get('/users', { operator: 'startsWith' });          // /users, /users/1, /users/1/posts
new StubBuilder().get('^/users/\\d+$', { operator: 'matches' });      // /users/1, /users/42
```

Stubs are checked in the order they were added, and the first match wins.

## Stubs: responses

### Plain responses

```ts
new StubBuilder().get('/users/1').response({
    status: 200,
    headers: { 'cache-control': 'no-store' },
    body: { id: 1, name: 'Ada' },
});
```

When `body` is an object, `content-type: application/json` is added for you. Your own `headers` override it.

### A sequence of responses

Return different responses on successive calls. `repeat` says how many times each one is returned before moving on;
after the last one, mountebank starts over from the first.

```ts
new StubBuilder().get('/status').multipleResponses([
    { status: 503, body: 'Starting…', repeat: 2 },
    { status: 200, body: 'Ready' },
]);
// 1st and 2nd call → 503, 3rd call → 200
```

Chaining `.response(...)` several times does the same thing.

### Proxying to a real service

```ts
new StubBuilder().get('/users', { operator: 'startsWith' }).proxyResponse({
    url: 'https://api.example.com',
    proxyMode: 'proxyAlways', // 'proxyAlways' (default), 'proxyOnce' or 'proxyTransparent'
});
```

See mountebank's [proxy docs](https://www.mbtest.dev/docs/api/proxies) for how the modes record and replay responses.
Proxies accept `wait`, `decorate` and [`chaos`](#chaos-random-errors-and-delays) too.

## Behaviors

Behaviors change a response before it's sent. Add them as options on `response()` (and, where noted, on
`proxyResponse()`).

### `wait`: add a fixed delay

```ts
new StubBuilder().get('/slow').response({ status: 200, body: 'Finally', wait: 2000 }); // 2 seconds
```

Also works on `proxyResponse()`.

### `copyFrom…`: copy parts of the request into the response

Put a token like `${userId}` in the response, then say where to copy its value from:

```ts
new StubBuilder().get('/users/42', { operator: 'startsWith' }).response({
    status: 200,
    body: { id: '${userId}' },
    copyFromPath: { into: '${userId}', using: { method: 'regex', selector: '\\d+' } },
});
// GET /users/42 → { "id": "42" }
```

| Option           | Copies from                  | Fields                                                             |
| ---------------- | ---------------------------- | ------------------------------------------------------------------ |
| `copyFromPath`   | the request path             | `into`, `using`                                                    |
| `copyFromBody`   | the request body             | `into`, `using`                                                    |
| `copyFromHeader` | a request header             | `name`, `into`, `using` (optional; default copies the whole value) |
| `copyFromQuery`  | a query-string parameter     | `name`, `into`, `using` (optional; default copies the whole value) |

`using.method` is `'regex'`, `'jsonpath'` or `'xpath'`, and `using.selector` is the expression.

### `decorate`: change the response with code

A `decorate` function runs inside mountebank for every matching request. It can read the request, change the
response, and keep state between requests:

```ts
import { Config, StubBuilder } from 'mountebank-client';

new StubBuilder().get('/counter').response({
    status: 200,
    decorate: (config: Config) => {
        config.state.count = (config.state.count ?? 0) + 1;
        config.response.body = { count: config.state.count };
    },
});
// 1st call → { "count": 1 }, 2nd call → { "count": 2 }, ...
```

You can also pass the function as a string, or an array of functions. Also works on `proxyResponse()`.

> **Important:** the function is converted to source text (`fn.toString()`) and sent to mountebank, which runs it in
> its own process. It **can't use anything defined outside its own body**: no imports, no variables or helpers from
> the surrounding file. Put everything it needs inside the function. It also needs the server to allow injection
> (`allowInjection: true`, or `mb --allowInjection`).

### `chaos`: random errors and delays

Make a stub fail or slow down some of the time, to test retries, timeouts and circuit breakers:

```ts
new StubBuilder().get('/orders').response({
    status: 200,
    body: [],
    chaos: {
        errorRate: 0.1,     // 10% of calls return an error…
        errorStatus: 503,   // …with this status (default 500) and an empty body*
        latencyRate: 0.3,   // 30% of calls are delayed…
        maxLatency: 800,    // …by a random 0–800 ms (default 1000)
    },
});
```

\* If the imposter has a default response, mountebank fills the empty body from it.

Every field is optional and defaults to no chaos. Invalid values (a rate outside 0–1, a negative delay) throw when you
build the stub.

**How it runs.** By default the builder turns `chaos` into a generated `decorate` function, so it works on any
mountebank version, including the stable one this package installs. Like any `decorate`, it needs the server to
allow injection (`allowInjection: true`, the default for `startMountebank`, or `mb --allowInjection`).
mountebank 2.9.6 adds its own `chaos` behavior, which doesn't need injection. Use it with
`chaos: { ..., implementation: 'native' }`, but only on 2.9.6 or later (not released yet), because older servers
reject it with `Unrecognized behavior: "chaos"`. Both behave the same.

#### Chaos on a proxy

`chaos` works on `proxyResponse()` too, which is a handy way to make a real backend's responses fail, arrive late, or
come back out of order:

```ts
new StubBuilder().get('/api', { operator: 'startsWith' }).proxyResponse({
    url: 'https://staging.example.com',
    chaos: { errorRate: 0.05, latencyRate: 1, maxLatency: 1500 },
});
```

mountebank applies a proxy's behaviors before it records the response, so the proxy mode matters:

| `proxyMode` with `chaos`     | What happens                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `proxyTransparent` (default) | Every call goes to the backend and gets its own chaos. Nothing is recorded.               |
| `proxyAlways`                | Live calls work the same, but the recordings include the injected errors.                |
| `proxyOnce`                  | Throws: it would record one outcome (maybe an error) and replay it on every later call. |

When you set `chaos` without a `proxyMode`, the builder uses `proxyTransparent`. Without `chaos`, the default stays
`proxyAlways`.

## Test runner setup

Helpers start mountebank once for the whole test run, in the runner's main process, point `MOUNTEBANK_URL` at it
for the workers, and recreate your imposters before each test. A test then never sees stubs, recorded requests or
`decorate` state left over from another one.

### Jest

```js
// jest.global-setup.js
module.exports = require('mountebank-client/jest').jestGlobalSetup({ port: 2525 });
// jest.global-teardown.js
module.exports = require('mountebank-client/jest').jestGlobalTeardown();
// jest.config.js: { globalSetup: './jest.global-setup.js', globalTeardown: './jest.global-teardown.js' }
```

```ts
import { useImposters } from 'mountebank-client/jest';

useImposters([usersApi]); // created before the file's tests, recreated before each test, deleted after the file
```

Jest runs test files in parallel, so give each file its own imposter ports.

### Playwright

```ts
// mountebank.setup.ts, with globalSetup: require.resolve('./mountebank.setup.ts') in playwright.config.ts
import { playwrightGlobalSetup } from 'mountebank-client/playwright';
export default playwrightGlobalSetup({ port: 2525 });
```

```ts
import { test as base } from '@playwright/test';
import { withImposters } from 'mountebank-client/playwright';

const test = withImposters(base, [usersApi]); // recreates usersApi before each test
```

The app under test calls the imposters on fixed ports, so tests that share them must not run at the same time: use
`workers: 1`.

### Any runner

```ts
import { resetImposters, setupMountebank, waitForMountebank } from 'mountebank-client';

const mb = await setupMountebank({ port: 2525, imposters: [usersApi] }); // or { url } for a running server
await resetImposters([usersApi]); // before each test
await mb.stop();                  // after the run
```

`setupMountebank` accepts the `startMountebank` options. With `url`, it uses that server instead (waiting until it
answers), and `stop()` only deletes the imposters it created. `waitForMountebank({ url })` waits for a server
started elsewhere, such as in Docker.

## Verifying requests

A stub controls what the fake service answers. To check what your application **sent**, turn on recording and read
the requests back:

```ts
import { clearRequests, getRequests, ImposterBuilder, StubBuilder } from 'mountebank-client';

await new ImposterBuilder({ port: 7117, protocol: 'http', recordRequests: true })
    .addStub(new StubBuilder().post('/orders').response({ status: 201 }))
    .addImposter();

// ... your application places an order ...

const orders = await getRequests({ imposterPort: 7117, filter: { method: 'POST', path: '/orders' } });
expect(orders).toHaveLength(1);
expect(orders[0].json).toEqual({ item: 'book', quantity: 2 });

await clearRequests({ imposterPort: 7117 }); // e.g. in beforeEach, so tests don't see each other's calls
```

Each recorded request has `method`, `path`, `query`, `headers`, `body` (a string), `json` (the parsed body, when it's
JSON) and `timestamp`. The `filter` accepts:

| Field | Matches when |
| ----- | ------------ |
| `method` | the method is the same, ignoring case |
| `path` | the path is exactly this string, or matches this `RegExp` |
| `query` | the query string has these entries |
| `headers` | these headers are present (names ignore case) |
| `body` | a string: the raw body is exactly this. An object: the JSON body contains these fields, at any depth |
| `operationName`, `args` | GraphQL: the operation has this name and contains these arguments |

If the imposter received requests without recording them, `getRequests` throws instead of returning an empty list,
so a forgotten `recordRequests: true` doesn't look like "no calls were made".

## Managing imposters

```ts
import { deleteImposters, getImposters, replaceStubs } from 'mountebank-client';

await getImposters();    // [{ port: 7117, protocol: 'http', name: 'Users API', numberOfRequests: 3 }, ...]
await replaceStubs({ imposterPort: 7117, stubs: [stubA, stubB] }); // swap all stubs at once ([] removes them)
await deleteImposters(); // remove every imposter, e.g. before a test run
```

`deleteImposters()` removes **every** imposter on the server, so don't call it while other test files use the same
server in parallel.

## GraphQL

GraphQL imposters use the [`mb-graphql`](https://www.npmjs.com/package/mb-graphql) plugin. Give the imposter your
schema and match operations with `any()`:

```ts
import { ImposterBuilder, StubBuilder } from 'mountebank-client';

const getUser = new StubBuilder()
    .any({ query: 'getUser', args: { id: 10 } })
    .response({ status: 200, data: { id: 10, name: 'Ada' } });

const createUser = new StubBuilder()
    .any({ mutation: 'createUser', args: { name: 'Grace' } })
    .response({ status: 200, data: { id: 11, name: 'Grace' } });

const graphqlApi = new ImposterBuilder({ port: 4000, protocol: 'graphql', schema: typeDefs }).addStubs([
    getUser,
    createUser,
]);
```

GraphQL responses use `data` instead of `body`.

> **Setup needed:** mountebank finds the plugin through a `protocols.json` file in your working directory. Create one
> next to your `package.json`:
>
> ```json
> { "graphql": { "createCommand": "node node_modules/mb-graphql/dist/index.js" } }
> ```

## Low-level client functions

The builders call these for you, but you can use them directly. Each one accepts `providerUrl` to override
`MOUNTEBANK_URL`.

| Function                                             | What it does                                        |
| ---------------------------------------------------- | --------------------------------------------------- |
| `addImposter({ port, protocol, stubs, ... })`        | Creates an imposter.                                |
| `getImposter({ port })`                              | Returns an imposter, including its stubs.          |
| `deleteImposter({ port })`                           | Deletes an imposter; does nothing if there's none. |
| `getImposters()`                                     | Lists all imposters with their request counts.      |
| `deleteImposters()`                                  | Deletes every imposter.                             |
| `replaceStubs({ imposterPort, stubs })`              | Replaces all stubs of an imposter.                  |
| `getRequests({ imposterPort, filter })`              | Returns the requests an imposter recorded.          |
| `clearRequests({ imposterPort })`                    | Forgets an imposter's recorded requests.            |
| `addStub({ imposterPort, stub })`                    | Adds a stub to an imposter.                         |
| `deleteStubByID({ imposterPort, stubID })`           | Deletes a stub by the ID the builder gave it.       |
| `deleteStubsByID({ imposterPort, stubIDs })`         | Deletes several stubs by ID.                        |
| `deleteStubByIndex({ imposterPort, stubIndex })`     | Deletes a stub by its position.                     |
| `getLogs()`                                          | Returns mountebank's log entries.                   |

### Errors

When mountebank rejects a call, or a stub to delete isn't there, the client throws a `MountebankError`. Its message
says what failed and why, in mountebank's own words when it gave any:

```text
MountebankError: Creating the imposter failed (HTTP 400): port 7117 is already in use (EADDRINUSE).
Delete the existing imposter first (deleteImposter) or use another port
```

It also exposes `operation` (e.g. `'ADD_IMPOSTER'`), `status` (mountebank's HTTP status) and `errors` (mountebank's
`errors` array), if you need to tell failures apart:

```ts
import { MountebankError, deleteImposter } from 'mountebank-client';

await deleteImposter({ port: 7117 }); // safe to call when there's no imposter
try {
    await usersApi.addImposter();
} catch (error) {
    if (error instanceof MountebankError && error.status === 400) {
        // ...
    }
    throw error;
}
```

## Skills for AI coding agents

The [`skills/`](./skills) folder has [Agent Skills](https://agentskills.io) that teach coding agents how to use this
package: writing stubs, running mountebank in tests, `decorate` functions, GraphQL, fault injection, and verifying requests. They follow
the open `SKILL.md` format, so they work with any agent that supports it (Claude Code, OpenAI Codex, Cursor, GitHub
Copilot, Gemini CLI, OpenCode, and others).

**Any supported agent**, with the [`skills`](https://github.com/vercel-labs/skills) CLI (needs Node 22.20+). It detects
the agents you have installed and asks which skills and agents to install for:

```sh
npx skills add vgcpaulino/mountebank-client
npx skills add vgcpaulino/mountebank-client -a cursor -a codex   # pick agents yourself
npx skills add vgcpaulino/mountebank-client -g                    # for all your projects
```

**Matching your installed version.** The skills also ship inside the npm package, so you can install the ones that
match the `mountebank-client` version in your project:

```sh
npx skills add ./node_modules/mountebank-client
```

Or let the `skills` CLI link them from your dependencies, so they update whenever you upgrade the package. This
command is marked experimental by the CLI:

```sh
npx skills experimental_sync
```

**Claude Code**, as a plugin:

```sh
/plugin marketplace add vgcpaulino/mountebank-client
/plugin install mountebank-client@mountebank-client
```

**By hand:** copy the folders under [`skills/`](./skills) into your agent's skills directory, e.g. `.agents/skills/`
(Codex, Cursor, GitHub Copilot, Gemini CLI, OpenCode and others) or `.claude/skills/` (Claude Code). Check your
agent's docs for its path.

## Development

```sh
nvm use                    # Node 22, from .nvmrc
yarn install
npx tsc --noEmit -p .      # type check
yarn test:unit
yarn test:integration      # starts a real mountebank on port 2525
```

`yarn start:dev` runs the users-service demo in [`examples/users-service`](./examples/users-service): mountebank on
2525 and a fake users API on 8080 (`GET /users/me`, `PATCH /users/:id`) that remembers changes.

`yarn test:playwright` runs the Playwright helper tests (no browser needed). `yarn test:integration` needs port 2525
free. Set `MB_TEST_PORT_OFFSET` (e.g. `1000`) to move the server and all
imposters to other ports, for example when running a second copy of the tests.

Planned work is in [TODO.md](TODO.md), and conventions for contributors (and coding agents) are in
[CLAUDE.md](CLAUDE.md).

## License

[MIT](LICENSE)
