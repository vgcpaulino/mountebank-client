# Changelog

User-visible changes to `mountebank-client`. The format follows [Keep a Changelog](https://keepachangelog.com/).
The version of the next release is chosen when releasing; until then, changes collect under **Unreleased**.

## Unreleased

Changes since 1.0.2.

### Breaking

- **A client object replaces the standalone functions.** Create one with `createClient({ url })` (default:
  `MOUNTEBANK_URL`, then `http://localhost:2525`), and send everything through it. The builders now only describe
  imposters and stubs; they no longer talk to mountebank. The `providerUrl` option and the default imposter port
  (7117, `MOUNTEBANK_IMPOSTER_DEFAULT_PORT`) are gone: every call names its imposter's port. To migrate:

  | 1.0.2                                                   | Now                                                    |
  | ------------------------------------------------------- | ------------------------------------------------------ |
  | `await imposterBuilder.addImposter()`                   | `const imposter = await mb.createImposter(imposterBuilder)` |
  | `addImposter({ port, protocol, stubs, ... })`           | `mb.createImposter(new ImposterBuilder({ port, protocol }).addStubs(stubs))` (or a plain object) |
  | `new StubBuilder({ imposterPort })` … `.addStub()`      | `mb.imposter(port).addStub(new StubBuilder()…)`        |
  | `stub.deleteStub()`                                     | `mb.imposter(port).deleteStub(stub)`                   |
  | `addStub({ imposterPort, stub })`                       | `mb.imposter(port).addStub(stub)`                      |
  | `deleteStubByID({ imposterPort, stubID })`              | `mb.imposter(port).deleteStub(stubID)`                 |
  | `deleteStubsByID({ imposterPort, stubIDs })`            | `deleteStub` for each ID                               |
  | `deleteStubByIndex({ imposterPort, stubIndex })`        | `deleteStub` with the `StubBuilder` or its ID          |
  | `getImposter({ port })`                                 | `mb.imposter(port).get()`                              |
  | `getLogs()`                                             | `mb.getLogs()`                                         |
  | `{ providerUrl }` on any call                           | `createClient({ url })`                                |

  where `const mb = createClient()`. `deleteStub` throws when the stub isn't there (see below).
- **`decorate` types are stricter.** `config.request.body` is typed `string` (what mountebank passes; it was `any`), so
  code that reads fields from it must `JSON.parse` it first, as it already had to at runtime. `Behavior.decorate`, in
  mountebank's own response format, is the source `string` the builder sends.
- **Interfaces are renamed** to drop the `I…` / `Is…` / `…Types` styles: `IsResponseBuilder` → `ResponseOptions`,
  `ProxyResponseBuilder` → `ProxyOptions`, `IResponseBuilder` → `ResponseBuilderOptions`, `IImposterBuilder` →
  `ImposterOptions`, `ICopyFromHeaderQuery` → `CopyFromHeaderOrQuery`, `ICopyFromPathBody` → `CopyFromPathOrBody`,
  `OperatorTypes` → `Operator`, `RequestMethodsTypes` → `HttpMethod`, `ProxyModeTypes` → `ProxyMode`,
  `DecorateFunctionType` → `DecorateFunction`, `ProxyResponseOptions` → `ProxyConfig`, `StandardResponse` →
  `IsResponseDefinition`, `ProxyResponse` → `ProxyResponseDefinition`. `ResponseType` is removed. Only code that
  names these types needs updating.
- **Starting mountebank moved to `mountebank-client/server`.** Import `startMountebank` and `setupMountebank` from
  there; the package root no longer exports them.
- **mountebank isn't installed with the package any more.** `@mbtest/mountebank` and `mb-graphql` are now optional peer
  dependencies, so clients of an external server (Docker, `mb`, remote) don't install mountebank at all. To start
  mountebank from your tests (`startMountebank`, `setupMountebank`, `jestGlobalSetup`, `playwrightGlobalSetup`),
  install `@mbtest/mountebank` yourself, plus `mb-graphql` for GraphQL imposters. Without it, starting throws an error
  that says what to install.
- **mountebank is now `@mbtest/mountebank` (`^2.9.5`).** mountebank was renamed after 2.9.1, and the old `mountebank`
  package gets no more releases. If your project installs or imports `mountebank` itself, switch to
  `@mbtest/mountebank`.
- **Node.js 20.19 or later is required** (`engines`), which is mountebank's own minimum.
- **Creating an imposter now throws when mountebank rejects it.** Before, `addImposter()` quietly ignored a 400
  response, for example a port already in use, and the old imposter stayed. `createImposter()` throws a
  `MountebankError`. To recreate an imposter, call `mb.imposter(port).delete()` first, or `mb.resetImposters([...])`.
- **Deleting a stub that isn't there now throws a `MountebankError`** ("no stub with ID …") instead of a `TypeError`.
- **All client errors are `MountebankError`s, with new messages.** For example, "Creating the imposter failed (HTTP 400):
  port 8080 is already in use (EADDRINUSE)…" replaces "ERROR: Imposter was NOT created!" and "GENERIC ERROR!". Code
  that matched on the old message text needs updating; check `error.operation` and `error.status` instead.
- **`startMountebank` only accepts connections from this machine by default:** mountebank's API and the HTTP/HTTPS
  imposters listen on `127.0.0.1`. If a container, VM or another host calls your imposters, pass
  `allowRemoteConnections: true`. (GraphQL imposters still listen on every interface; mb-graphql can't be bound.)
- **`startMountebank` no longer writes `./mb.log`.** The log now goes to the system temp folder
  (`mountebank-client-<port>.log`), and `getLogs()` keeps working. Pass `logFile: '<path>'` to choose the file, or
  `logFile: false` for none.
- **Only the package's entry points can be imported.** `package.json` now has `exports`, so deep imports such as
  `mountebank-client/dist/builders` fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Import from `mountebank-client` (or
  `/server`, `/jest`, `/playwright`) instead. The dev-only `dist/start` file (shipped in 1.0.2) is no longer published.
- **`startMountebank({ allowInjection: false })` is now honored.** It was ignored before, and injection was always on.
  If you passed `false` but use `decorate` or `chaos`, remove the option.

### Added

- **`chaos` option** on `response()` and `proxyResponse()`: random errors and latency
  (`{ errorRate, errorStatus, latencyRate, maxLatency }`).
  - By default it works on any mountebank version through an injected `decorate`, so injection must be allowed.
    `implementation: 'native'` uses mountebank's own behavior instead (2.9.6+).
  - On a proxy, `chaos` defaults the mode to `proxyTransparent`, and rejects `proxyOnce`.
- **Request recording:** `recordRequests: true` on `ImposterBuilder`, plus `mb.imposter(port).getRequests(filter?)` to
  read what an imposter received and `clearRequests()` to forget it.
  - `getRequests()` filters by method, path, query, headers, JSON body, or GraphQL operation and arguments.
  - It throws if the imposter received requests without recording them.
- **Test runner helpers:**
  - `mountebank-client/jest`: `jestGlobalSetup`, `jestGlobalTeardown` and `useImposters`.
  - `mountebank-client/playwright`: `playwrightGlobalSetup` and `withImposters`.
  - For any runner: `mb.resetImposters(imposters)`, `waitForMountebank` from the package root, and `setupMountebank`
    (whose handle has a `client`) from `mountebank-client/server`.
  - `useImposters` and `withImposters` take an optional `client`; by default they use `createClient()`.

  They start mountebank once per run (or use an external server) and recreate the imposters before each test.
- **Imposter lifecycle:** `mb.getImposters()` lists every imposter, `mb.deleteImposters()` removes them all,
  `mb.imposter(port).replaceStubs(stubs)` swaps all stubs of an imposter at once, `addStubs(stubs)` adds several, and
  `delete()` deletes one imposter (doing nothing when there's none).
- **`createImposter` accepts a plain imposter object without a `port`**: mountebank picks a free one, and the returned
  handle has it.
- **GraphQL needs no setup with `startMountebank`.** When the working directory has no `protocols.json` and `mb-graphql`
  is installed, a protocols file pointing at it is generated in the temp folder. A new `protofile` option picks a file,
  or `false` for none. `./protocols.json` is still used when it exists.
- **`Config<State>`** types `config.state` in `decorate` functions (`Config<{ count?: number }>`); without a type
  argument, state still accepts any field. The request, response and logger types are exported as `DecorateRequest`,
  `DecorateResponse` and `DecorateLogger`.
- **`logger` option on `createClient`**: gets a `debug` message for every call to mountebank (method, URL, status,
  time). `createClient({ logger: console })` shows them.
- **`client.imposter()` accepts an `ImposterBuilder`** as well as a port, so the port is written in one place.
- **`allowCORS`** option on imposters.
- **`ImposterBuilder.addStubs()`.**
- **`MountebankError`** is exported, with `operation`, `status` and mountebank's `errors`.
- **`startMountebank` options** `logFile` and `allowRemoteConnections`.
- **Agent Skills** for coding agents, in `skills/`, including `mountebank-requests` for verifying calls. They are shipped in the package and installable with
  `npx skills add vgcpaulino/mountebank-client` or as a Claude Code plugin.

### Changed

- **No more axios dependency.** The client uses Node's built-in `fetch`, so the package depends only on
  `@mbtest/mountebank` and `mb-graphql`. When mountebank can't be reached at all, calls now throw a `MountebankError`
  ("… can't reach mountebank at http://localhost:2525 (ECONNREFUSED)") instead of axios's network error.
- **`mb.imposter(port).get()` returns a typed `ImposterDetails`** (the imposter plus `numberOfRequests`,
  `recordRequests` and `requests`) instead of `any`, and `getLogs()` returns typed `MountebankLog` entries.
- **`decorate` accepts a mixed array** of functions and strings (`DecorateInput`).
- **`package.json` has `repository`, `homepage` and `bugs`**, so npm links back to GitHub.

- **Importing the package no longer loads mountebank.** It's loaded only when `startMountebank` runs, so the package
  can be imported in Jest.

### Fixed

- **`startMountebank({ imposters })` keeps each imposter's `name`.** It was dropped before.
- **`startMountebank`'s `server.close()` now also stops the imposters.** mountebank's own `close()` stops only its
  API server, so the imposters (and `mb-graphql` processes) kept the Node process alive.
- **`startMountebank` startup race:** it now waits for the server to listen before creating imposters.
- **`wait` on `response()`** is now passed to mountebank. It was silently dropped before.
