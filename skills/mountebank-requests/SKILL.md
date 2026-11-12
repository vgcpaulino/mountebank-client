---
name: mountebank-requests
description: Verify what an application sent to a mocked HTTP, HTTPS or GraphQL dependency with mountebank-client. Covers turning on request recording (recordRequests), reading recorded requests with getRequests, filtering them by method, path, query, headers, JSON body or GraphQL operation and arguments, clearing them between tests with clearRequests, and asserting calls in Jest, Vitest or Playwright. Use when a test must check that a call was made, how often, or with which data, rather than only what the mock returned.
---

# Verifying requests with mountebank-client

A stub decides what the fake service **answers**. To check what the application **sent**, record the requests an
imposter receives and assert on them. mountebank-client reads the recordings; your test runner does the asserting.

For creating imposters and stubs, see **mountebank-stubs**. For running the server, see **mountebank-setup**.

## 1. Turn recording on

Recording is off by default. Turn it on when you create the imposter:

```ts
import { ImposterBuilder, StubBuilder } from 'mountebank-client';

await new ImposterBuilder({ port: 8080, protocol: 'http', recordRequests: true })
    .addStub(new StubBuilder().post('/orders').response({ status: 201, body: { id: 1 } }))
    .addImposter();
```

You can't switch recording on for an imposter that already exists: delete it and create it again.

## 2. Read the recorded requests

```ts
import { getRequests } from 'mountebank-client';

const requests = await getRequests({ imposterPort: 8080 }); // oldest first
```

Each HTTP/HTTPS request has `method`, `path`, `query`, `headers`, `body` (always a **string**), `json` (the body
parsed, when it's valid JSON), `form` (for URL-encoded forms) and `timestamp`.

- `getRequests` throws a `MountebankError` if the imposter received requests but doesn't record them, so a missing
  `recordRequests: true` fails loudly instead of looking like "no calls were made".
- It returns `[]` when the imposter hasn't received anything yet.

## 3. Filter

Pass a `filter`; every field you set must match, and fields you leave out match anything.

```ts
const orders = await getRequests({
    imposterPort: 8080,
    filter: {
        method: 'POST',              // case-insensitive
        path: '/orders',             // exact string, or a RegExp: /^\/orders\/\d+$/
        query: { page: '2' },        // these entries must be present
        headers: { 'x-tenant': 'acme' }, // header names are case-insensitive
        body: { item: 'book' },      // the JSON body must contain these fields (at any depth)
    },
});
```

- An **object** `body` matches a JSON body that contains it. Nested objects may have extra fields; arrays must have
  the same length, element by element. A **string** `body` must equal the raw body exactly.
- Query values are strings (`{ page: '2' }`, not `{ page: 2 }`); a key repeated in the URL has an array of values.
- For anything else, filter the returned array yourself: `(await getRequests({ imposterPort })).filter(...)`.

## 4. Assert

The package doesn't depend on a test runner, so use your runner's assertions:

```ts
const orders = await getRequests({ imposterPort: 8080, filter: { method: 'POST', path: '/orders' } });

expect(orders).toHaveLength(1);                            // called exactly once
expect(orders[0].json).toEqual({ item: 'book', quantity: 2 }); // with exactly this body
expect(orders[0].headers?.['Authorization']).toBeDefined(); // header names keep the client's casing
```

To assert that something did **not** happen, check for an empty list:

```ts
expect(await getRequests({ imposterPort: 8080, filter: { method: 'DELETE' } })).toEqual([]);
```

Read the requests **after** the application has finished the call. In UI tests, wait for the visible result first
(or poll `getRequests` until it has the expected length), because the browser may still be sending.

## 5. Keep tests independent

Recordings accumulate until cleared. Clear them before each test, so one test's calls don't count in the next:

```ts
import { clearRequests } from 'mountebank-client';

beforeEach(async () => {
    await clearRequests({ imposterPort: 8080 }); // also resets the imposter's request count
});
```

Deleting the imposter (`deleteImposter`, or `deleteImposters` for all of them) also removes its recordings.

## GraphQL

GraphQL imposters record operations instead of HTTP details: `operationType` (`'query'` or `'mutation'`),
`operationName` and `args`. Filter on those:

```ts
await new ImposterBuilder({ port: 4000, protocol: 'graphql', schema, recordRequests: true }).addImposter();

// ... the app runs: mutation { createUser(name: "Ada") { id } }

const created = await getRequests({
    imposterPort: 4000,
    filter: { operationName: 'createUser', args: { name: 'Ada' } },
});
expect(created).toHaveLength(1);
expect(created[0].operationType).toBe('mutation');
```

## Notes

- mountebank keeps recordings in memory. For long runs with many requests, clear them regularly.
- Recording also works on proxies: requests forwarded through a `proxyResponse()` stub are recorded too.
