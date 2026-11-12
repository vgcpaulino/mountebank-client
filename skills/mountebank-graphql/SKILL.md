---
name: mountebank-graphql
description: Mock a GraphQL API with mountebank-client using the graphql protocol (mb-graphql). Covers creating a graphql imposter from a schema, stubbing queries and mutations by name and arguments with StubBuilder.any(), returning data, and the protofile the server needs. Use when tests need a fake GraphQL endpoint built with mountebank-client.
---

# Mocking GraphQL APIs

GraphQL imposters use the [mb-graphql](https://github.com/bashj79/mb-graphql) protocol plugin. The imposter serves
your schema; stubs pick a query or mutation by **name** and **arguments** and supply the data. Fields you leave out
are filled with random values that fit the schema.

## Server requirements

mountebank must load the plugin through a protofile. Install `mb-graphql` next to mountebank and create
`protocols.json`:

```json
{ "graphql": { "createCommand": "node node_modules/mb-graphql/dist/index.js" } }
```

- CLI: `mb start` loads `protocols.json` from the current working directory by default; pass
  `--protofile <path>` if it lives elsewhere. In Docker, mount the file and `mb-graphql` into the container.
- `startMountebank()` reads `./protocols.json` from the **current working directory**, so run it from the folder that
  holds the file.

Without the protofile, creating a `graphql` imposter fails and `addImposter()` throws a `MountebankError` with
mountebank's message.

## Imposter

```ts
import { ImposterBuilder, StubBuilder } from 'mountebank-client';

const schema = `
    type User { id: Int, name: String, email: String }
    type Query { getUser(id: Int): User, getAllUsers: [User] }
    type Mutation { createUser(name: String!, email: String): User }
`;

const imposterPort = 4000;

await new ImposterBuilder({ port: imposterPort, protocol: 'graphql', name: 'users-graphql', schema }).addImposter();
```

## Stubs

Use `any()` instead of `get()` / `post()`: it matches the GraphQL operation, not an HTTP method and path. Put the
result in `data` (not `body`). `data` is the value of that one field, not the whole `{ data: { getUser: ... } }`
envelope.

```ts
// query { getUser(id: 1) { id name } }
await new StubBuilder({ imposterPort })
    .any({ query: 'getUser', args: { id: 1 } })
    .response({ data: { id: 1, name: 'Ada' } })
    .addStub();

// any getAllUsers call
await new StubBuilder({ imposterPort })
    .any({ query: 'getAllUsers' })
    .response({ data: [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }] })
    .addStub();

// mutation { createUser(name: "Linus") { id } }
await new StubBuilder({ imposterPort })
    .any({ mutation: 'createUser', args: { name: 'Linus' } })
    .response({ data: { id: 3, name: 'Linus' } })
    .addStub();
```

- `args` matching follows the `operator` option (default `equals`). With `equals` only the listed arguments are
  checked, so a stub for `{ name: 'Linus' }` also answers calls that pass an `email`. Values match loosely (`'7'`
  matches an `Int` of `7`); use the schema's types anyway for readability.
- A query or mutation that no stub matches still answers, with random data that fits the schema. Stub every
  operation whose values the test checks.
- Stub order and "first match wins" work the same as for HTTP (see **mountebank-stubs**).
- To check which operations the application sent, create the imposter with `recordRequests: true` and filter
  `getRequests` by `operationName` and `args` (see **mountebank-requests**).

## Calling it

The imposter is a normal GraphQL endpoint: `POST http://localhost:4000/` with `{ "query": "..." }`. Opening it in a
browser shows a GraphQL playground, which is handy for checking what the stubs return.

```ts
const res = await fetch('http://localhost:4000/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ getUser(id: 1) { id name } }' }),
});
// { data: { getUser: { id: 1, name: 'Ada' } } }
```
