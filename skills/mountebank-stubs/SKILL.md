---
name: mountebank-stubs
description: Mock HTTP/HTTPS APIs in TypeScript/JavaScript tests with the mountebank-client package. Covers creating imposters with ImposterBuilder, adding stubs with StubBuilder, matching requests by method and path (equals, startsWith, endsWith, contains, matches), static and sequenced responses, default responses, copying request values into responses, deleting stubs and imposters, replacing all stubs, listing imposters, and handling MountebankError. To check what the application sent, see mountebank-requests. Use when writing or changing test mocks that import from 'mountebank-client', or when asked to fake an HTTP dependency with mountebank from Node.
---

# Mocking HTTP APIs with mountebank-client

`mountebank-client` builds mountebank imposters and stubs with fluent builders, so you never write mountebank's
JSON by hand. It talks to a running mountebank server over its REST API (default `http://localhost:2525`).

If the server isn't running yet, or the tests can't reach it, see the **mountebank-setup** skill first. To check
which requests the application made (not just what the mock answered), see **mountebank-requests**.

## Mental model

- **mountebank server**: admin API on port 2525. Hosts any number of imposters.
- **Imposter**: a fake server on its own port with one protocol (`http`, `https` or `graphql`). Point the code under
  test at `http://localhost:<imposter port>`.
- **Stub**: predicates (which requests it answers) plus responses (what it sends back). For each request, mountebank
  tries stubs **in order** and the **first match wins**.
- **Default response**: what the imposter sends when no stub matches. Without one, mountebank returns `200` with an
  empty body, which hides missing mocks. Set one.

## Quick start

```ts
import { ImposterBuilder, StubBuilder } from 'mountebank-client';

const port = 8080;

await new ImposterBuilder({ port, protocol: 'http', name: 'users-service' })
    .addDefaultResponse({ status: 404, body: { error: 'no stub matched' } })
    .addStub(new StubBuilder().get('/users/1').response({ status: 200, body: { id: 1, name: 'Ada' } }))
    .addImposter();

// Later, e.g. inside a single test, add a stub to the running imposter.
// A stub created on its own needs imposterPort: without it the stub goes to port 7117.
const stub = await new StubBuilder({ imposterPort: port })
    .post('/users')
    .response({ status: 201, body: { id: 2 } })
    .addStub();

// ... exercise the code under test against http://localhost:8080 ...

await stub.deleteStub();
```

## Imposters

```ts
new ImposterBuilder({ port, protocol, name?, allowCORS?, schema? })
    .addDefaultResponse({ status, headers?, body? })
    .addStub(stub)           // a StubBuilder; it takes on this imposter's port (unless it already has one)
    .addStubs([stubA, stubB])
    .addImposter();          // async: POSTs the imposter to mountebank
```

- `protocol`: `'http' | 'https' | 'graphql'`. Only these are supported. For GraphQL see **mountebank-graphql**.
- `allowCORS: true` makes the imposter answer CORS preflight requests (useful for browser tests).
- If an imposter already exists on that port, `addImposter()` throws a `MountebankError` ("port … is already in
  use"). Use a unique port per test file, or delete the old imposter first. `deleteImposter` does nothing when there
  is none, so it's safe to call unconditionally:

  ```ts
  import { deleteImposter } from 'mountebank-client';

  await deleteImposter({ port });
  ```

## Matching requests (predicates)

```ts
new StubBuilder({ imposterPort })
    .get('/users/1')                                      // exact method + path
    .get('/users', { operator: 'startsWith' })            // /users, /users/1, /users?x=1 ...
    .get('/users/\\d+$', { operator: 'matches' })        // regex (JavaScript syntax, as a string)
```

Methods: `get`, `post`, `put`, `patch`, `delete`, `options`. Operators: `equals` (default), `startsWith`,
`endsWith`, `contains`, `matches`.

Rules that bite:

- **Every predicate on a stub must match (AND).** `.get('/a').get('/b')` matches nothing. Use two stubs, or one
  `matches` regex like `'^/(a|b)$'`.
- **Order matters.** Stubs added later go to the end of the list, so a broad stub (`startsWith '/users'`) added
  first shadows a specific one (`equals '/users/1'`) added after it. Add specific stubs first.
- **The builders only match method and path.** To also match query parameters, pass a raw predicate:

  ```ts
  new StubBuilder({ imposterPort }).addPredicate({ equals: { method: 'GET', path: '/users', query: { page: '2' } } });
  ```

## Responses

```ts
.response({
    status: 200,              // emitted as mountebank's statusCode
    headers: { 'x-id': '1' }, // optional
    body: { id: 1 },          // object → JSON, content-type: application/json is added for you
    wait: 250,                // optional fixed delay in ms
})
```

- An object `body` gets `content-type: application/json` unless you set `content-type` yourself.
- A string `body` is sent as-is (set `content-type` for HTML, XML, etc.).
- Other options: `decorate` (compute the response at request time, see **mountebank-decorate**), `chaos` and
  `proxyResponse()` (fault injection and proxying, see **mountebank-faults**).

### Sequences (first call fails, second succeeds, ...)

```ts
new StubBuilder({ imposterPort })
    .get('/jobs/1')
    .multipleResponses([
        { status: 202, body: { state: 'running' }, repeat: 2 }, // first two calls
        { status: 200, body: { state: 'done' } },               // third call
    ]);
```

Calling `.response()` several times does the same thing. When the list runs out, mountebank **starts again from the
first response**. If the last response must stick, give it a large `repeat`.

### Copying request values into the response

Put a token such as `${userId}` in the body or headers, then say where its value comes from:

```ts
.get('/users/\\d+', { operator: 'matches' })
.response({
    status: 200,
    body: { id: '${userId}' },
    copyFromPath: { into: '${userId}', using: { method: 'regex', selector: '\\d+' } },
})
```

| Option           | Source                  | `using`                                         |
| ---------------- | ----------------------- | ----------------------------------------------- |
| `copyFromPath`   | request path            | required (`regex`)                              |
| `copyFromBody`   | request body            | required (`regex`, `jsonpath` or `xpath`)       |
| `copyFromHeader` | header named by `name`  | optional, defaults to the whole value (`.+`)    |
| `copyFromQuery`  | query param named `name`| optional, defaults to the whole value (`.+`)    |

```ts
copyFromHeader: { name: 'x-request-id', into: '${reqId}' }
copyFromBody:   { into: '${email}', using: { method: 'jsonpath', selector: '$.email' } }
```

Copied values are always strings. If you need a number, or logic, use `decorate`.

## Removing stubs

- `await stub.deleteStub()` removes the stub it was called on. Each `StubBuilder` gets a random `stubID` that the
  client uses to find it on the imposter.
- `deleteStub()` throws a `MountebankError` ("no stub with ID …") if the stub isn't on the imposter any more
  (deleted twice, or the imposter was recreated).
- `deleteStubsByID({ imposterPort, stubIDs })` removes several, and throws at the first ID it can't find.
- To wipe one imposter, `deleteImposter({ port })` and create it again; `deleteImposters()` removes all of them.
- To swap every stub of a running imposter at once, `replaceStubs({ imposterPort, stubs })` (an empty array removes
  them all). StubBuilders without a port take on that imposter's port.

## Errors

Every client call that mountebank rejects throws a `MountebankError`. Its message says what failed and why, in
mountebank's words: for example "Creating the imposter failed (HTTP 400): port 8080 is already in use
(EADDRINUSE)…". It also has these fields:

```ts
import { MountebankError } from 'mountebank-client';

try {
    await imposter.addImposter();
} catch (error) {
    if (error instanceof MountebankError) {
        error.operation; // 'ADD_IMPOSTER', 'ADD_STUB', 'DELETE_STUB', 'GET_IMPOSTER', 'DELETE_IMPOSTER', 'GET_LOGS'
        error.status;    // mountebank's HTTP status, e.g. 400 or 404 (undefined for client-side checks)
        error.errors;    // mountebank's own `errors` array: [{ code, message }]
    }
    throw error;
}
```

Don't catch these to carry on: they mean the mock isn't what the test expects.

## Inspecting what mountebank has

```ts
import { getImposter, getImposters, getLogs } from 'mountebank-client';

const all = await getImposters();                    // [{ port, protocol, name?, numberOfRequests }]
const imposter = await getImposter({ port: 8080 }); // stubs as mountebank stored them
const logs = await getLogs();                        // mountebank's log: which stub matched, injection errors ...
```

When a request doesn't get the response you expect, read `getImposter()` first (is the stub there, on the right
port, in the right order?) and then `getLogs()`.

## Rules for writing mocks with this package

- Use the builders and their friendly names (`status`, `errorStatus`, `maxLatency`). Don't paste mountebank JSON
  (`statusCode`, `is`, `behaviors`) into builder options; the builders produce it.
- Pass `imposterPort` to a `StubBuilder` you create on its own and add with `.addStub()`. A stub you hand to an
  `ImposterBuilder` takes on that imposter's port, so its `deleteStub()` works without one.
- Give every test file its own imposter port so parallel workers don't share stubs.
- The library's API is still changing (see the repository's TODO.md). If an example here doesn't type-check, trust
  the package's type definitions and its tests over this skill.
