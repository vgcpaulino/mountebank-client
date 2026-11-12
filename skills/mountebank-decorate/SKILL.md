---
name: mountebank-decorate
description: Write decorate functions for mountebank-client stubs, which compute or change a mocked response at request time inside mountebank (echo request data, branch on the request, keep state across calls for fake CRUD APIs). Explains the hard rule that the function is sent as source text and cannot use imports, closures or outer variables, the Config object, state, and how to debug injection errors. Use when a stub's response must depend on the request or on earlier requests, or when a decorate function misbehaves.
---

# Dynamic responses with `decorate`

`decorate` runs a function on the response **inside mountebank**, after the stub matched and before the response is
sent. Use it when static responses and `copyFrom*` (see **mountebank-stubs**) aren't enough.

The server must run with `--allowInjection` (`startMountebank` enables it by default). See **mountebank-setup**.

## The one rule: the function travels as text

The client calls `fn.toString()` and sends the source to mountebank, which `eval`s it in its own process. So the
function body is all mountebank gets.

**Not available inside a decorate function:**

- imports (`import`, `require` of your project's modules)
- variables, constants, helpers or classes defined outside the function body, even in the same file
- values from the test (IDs, fixtures, `this`)
- `async` / `await`. Keep the function synchronous. (Compilers targeting older JavaScript also wrap `async` and object
  rest/spread in helpers such as `__awaiter` and `__rest` that live outside the function, which breaks it.)

**Available:** the `config` argument, JavaScript built-ins (`JSON`, `Math`, `Date`, `RegExp`, ...), and anything you
declare inside the body.

```ts
// ❌ Broken: `users` and `makeUser` live outside the function, mountebank never sees them.
const users = { 1: { name: 'Ada' } };
const makeUser = (id: string) => ({ id, ...users[id] });
.response({ status: 200, decorate: (config: Config) => { config.response.body = makeUser('1'); } })

// ✅ Works: everything it needs is inside the body.
.response({
    status: 200,
    decorate: (config: Config) => {
        const users: Record<string, { name: string }> = { 1: { name: 'Ada' } };
        const id = config.request.path.split('/').pop() as string;
        config.response.body = users[id] ? { id, ...users[id] } : { error: 'not found' };
        config.response.statusCode = users[id] ? 200 : 404;
    },
})
```

Never "refactor" a decorate body to share code with outer helpers. If several stubs need the same logic, duplicate
it, or write the function once as a **string** and reuse that string:

```ts
const echoPathId = `(config) => { config.response.body = { id: config.request.path.split('/').pop() }; }`;
.response({ status: 200, decorate: echoPathId })
```

To pass test data in, put it in the static `body` and read it from `config.response.body` in the function.

## The `config` object

```ts
import { Config } from 'mountebank-client';

(config: Config) => {
    config.request.method;   // 'GET', 'POST', ...
    config.request.path;     // '/users/42' (no query string)
    config.request.query;    // { page: '2' } — values are strings
    config.request.headers;  // header values are strings
    config.request.body;     // a STRING: JSON.parse it yourself
    config.response;         // the response built from the stub: { statusCode, headers, body }
    config.state;            // mutable object kept between requests (see below)
    config.logger.info('...'); // goes to mountebank's log (read it with client.getLogs())
};
```

Type your state with `Config`'s type argument, so TypeScript checks it:
`decorate: (config: Config<{ todos?: Record<string, unknown> }>) => { ... }`. Without one, `config.state` accepts any
field. The type only helps while writing: mountebank still receives the source text.

Either change `config.response` in place, or return a new response object. mountebank also waits for a returned
`Promise` (written by hand, e.g. `new Promise((resolve) => setTimeout(() => resolve(config.response), 200))`),
which is how the builder's `chaos` adds latency. Don't use the `async` keyword for this (see above). Note the response uses mountebank's own
field name, `statusCode`, not the builder's `status`.

`decorate` can be a function, a string, or an array of them (applied in order).

## Keeping state between requests

`config.state` is one object per **imposter**, shared by all its stubs, and kept until the imposter is deleted. Use
it to fake a small stateful API:

```ts
new StubBuilder()
    .post('/todos')
    .response({
        status: 201,
        decorate: (config: Config) => {
            config.state.todos ??= {};
            let todo: Record<string, unknown> = {};
            try {
                todo = JSON.parse(config.request.body || '{}');
            } catch (error) {
                config.response.statusCode = 400;
                config.response.body = { message: 'body must be JSON' };
                return;
            }
            const id = String(Object.keys(config.state.todos).length + 1);
            config.state.todos[id] = { id, ...todo };
            config.response.body = config.state.todos[id];
        },
    });

new StubBuilder()
    .get('/todos/', { operator: 'startsWith' })
    .response({
        status: 200,
        decorate: (config: Config) => {
            const id = config.request.path.split('/').pop() as string;
            const todo = (config.state.todos || {})[id];
            config.response.statusCode = todo ? 200 : 404;
            config.response.body = todo || { message: 'not found' };
        },
    });
```

- Always initialise state defensively (`config.state.todos ??= {}`): the first request finds it empty.
- State survives between tests. Recreate the imposter when a test needs a clean slate: `useImposters` (Jest),
  `withImposters` (Playwright) or `client.resetImposters(imposters)` do that before each test.

## Debugging

1. `createClient().getLogs()` (or mountebank's console output). A failing function logs `injection X=> <error>` plus the full source
   mountebank received.
2. `ReferenceError: x is not defined` almost always means the function used something from outside its body.
3. `SyntaxError` usually means a TypeScript-only construct survived, or the source was cut. Check the source in the
   log.
4. Use `config.logger.info(JSON.stringify(config.request))` to see what mountebank passes in.
