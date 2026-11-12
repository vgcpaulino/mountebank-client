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

> **Note:** the server currently writes `mb.pid` and `mb.log` into your working directory and accepts connections from
> any IP address. Making these configurable is on the [TODO list](TODO.md).

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

> **Tip:** pass `imposterPort` to `new StubBuilder({ imposterPort })` whenever you call `stub.addStub()` yourself.
> Without it the stub goes to the default port (7117), not to the imposter you might expect.

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
| `addStub({ imposterPort, stub })`                    | Adds a stub to an imposter.                         |
| `deleteStubByID({ imposterPort, stubID })`           | Deletes a stub by the ID the builder gave it.       |
| `deleteStubsByID({ imposterPort, stubIDs })`         | Deletes several stubs by ID.                        |
| `deleteStubByIndex({ imposterPort, stubIndex })`     | Deletes a stub by its position.                     |
| `getLogs()`                                          | Returns mountebank's log entries.                   |

## Skills for AI coding agents

The [`skills/`](./skills) folder has [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) that teach
coding agents how to use this package: writing stubs, running mountebank in tests, `decorate` functions, GraphQL,
and fault injection. In Claude Code, install them as a plugin:

```sh
/plugin marketplace add vgcpaulino/mountebank-client
/plugin install mountebank-client@mountebank-client
```

Other agents can read the `SKILL.md` files directly, or you can copy a skill folder into your project's
`.claude/skills/`.

## Development

```sh
nvm use                    # Node 22, from .nvmrc
yarn install
npx tsc --noEmit -p .      # type check
yarn test:unit
yarn test:integration      # starts a real mountebank on port 2525
```

`yarn test:integration` needs port 2525 free. Set `MB_TEST_PORT_OFFSET` (e.g. `1000`) to move the server and all
imposters to other ports, for example when running a second copy of the tests.

Planned work is in [TODO.md](TODO.md), and conventions for contributors (and coding agents) are in
[CLAUDE.md](CLAUDE.md).

## License

[MIT](LICENSE)
