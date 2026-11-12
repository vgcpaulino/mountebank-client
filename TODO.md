# TODO

Roughly in priority order. Boundaries and design rules are in [CLAUDE.md](CLAUDE.md).

## 1. Bugs

- [x] `startMountebank` doesn't await `create()` before adding imposters, so the first `addImposter` can hit a
      server that isn't listening yet (`src/server/mountebankServer.ts`).
- [x] `allowInjection` option is ignored: a hardcoded `'allow-injection': true` overrides it.
- [x] `StubBuilder.response()` dropped the `wait` option, so it never reached mountebank.
- [ ] `startMountebank` writes `mb.pid` and `mb.log` into the consumer's working directory and allows connections from
      any IP (`ipWhitelist: ['*']`). Make them options with safe defaults (no files, local only).
- [ ] `addImposter` silently returns on a 400 (e.g. port already in use). Surface it as an error.
- [ ] `deleteStubByID` crashes when the stub ID isn't found (`getStubIndex(undefined)`).
- [ ] `StubBuilder.addStub()` uses the default port (7117) unless `imposterPort` is passed; stubs aren't tied to the
      imposter they belong to.
- [ ] Error messages: `DELETE_STUB` and `GET_LOGS` fall through to `'GENERIC ERROR!'`, and `ADD_IMPOSTER` drops the
      status and response body. Add a dedicated error type with operation, status and mountebank's message.
- [ ] `yarn test:integration` passes but Jest doesn't exit ("Jest did not exit one second after...") when its output
      isn't a terminal (redirected, CI), and the `yarn start` mountebank server it spawned is left running. Look at
      `tests/config/globalTeardown.ts` (jest-dev-server only kills `yarn`, not the `ts-node-dev` child).

## 2. Packaging (blocks publishing)

- [x] Package name: `mountebank-client` is already ours on npm (1.0.2 published 2025-02-06).
- [ ] Fix `package.json`: `main`/`types`/`exports` point at `dist/`, add `files`, `engines: { node: ">=18" }`,
      `prepublishOnly` build, description, author, repository, keywords. Reset version to `0.x`.
- [ ] Fix license mismatch: `package.json` says ISC but `LICENSE` is MIT.
- [ ] Split entry points: core client/builders (no `mountebank` import), `./server` (in-process server), `./jest`
      and `./playwright` helpers.
- [ ] Make `@mbtest/mountebank` an optional peer dependency instead of a dependency.
- [ ] Bump `@mbtest/mountebank` to `^2.9.6` once it's released. We stay on the latest stable (2.9.5), which doesn't
      have the native `chaos` behavior: `chaos` defaults to an injected `decorate` that works on 2.9.5, and the
      `implementation: 'native'` integration tests skip themselves below 2.9.6. After the bump, consider making
      `'native'` the default (no injection needed), and update the README and the faults/setup skills.
- [ ] Stop relying on the `declare module 'mountebank/src/mountebank'` shim in `index.d.ts` leaking into consumers'
      types; keep internal typings private to the server entry point.
- [ ] Exclude `src/start.ts` and other dev-only files from `dist/`.
- [ ] GraphQL with `startMountebank` needs a `protocols.json` in the consumer's working directory (it's read from
      `./protocols.json` and isn't shipped). Generate it or ship it, so GraphQL works without manual setup.

## 3. Project layout

- [ ] Move the users-service demo (`src/stubs/`, `src/imposters/`, `src/main.ts`) to `examples/`; update
      `start:dev` and `tests/e2e/users.example.spec.ts`.
- [ ] Decide what to do with `src/helpers/` (sample imposters): move to `examples/` or delete.

## 4. API redesign (breaking changes OK until 1.0)

- [ ] Replace the global functions plus env-var defaults with a client instance, e.g.
      `createClient({ url })` → `client.imposter(8080).stub(...)`.
- [ ] Add imposter lifecycle: delete one imposter, delete all, get all, replace all stubs on an imposter.
- [ ] Add request recording and verification (`recordRequests`, read an imposter's recorded `requests`, helpers to
      assert "was called with ...").
- [ ] Make naming consistent: friendly names everywhere (`status` → `statusCode` mapping already exists; audit the
      rest), and clean up interface names (`IsResponseBuilder` vs `IResponseBuilder`, `IDefaultResponse`).
- [x] Remove the deprecated `addDefaultReponse` alias (renamed on main without an alias).
- [ ] Type `Config.state` (generic parameter) instead of `any`.
- [ ] Add a logger option; no `console.*` in library code.

## 4a. Keeping up with mountebank

- [x] Switch from `mountebank` to `@mbtest/mountebank` (renamed in 2.9.2) and require Node 20.19+.
- [x] Support the `chaos` behavior (mountebank 2.9.6): `chaos: { errorRate, errorStatus, latencyRate, maxLatency }`
      on `response()` and `proxyResponse()`.
- [x] Support `allowCORS` on imposters (mountebank 2.9.2).

## 5. Test helpers

- [ ] Runner-agnostic core: start server (optional), reset imposters/stubs, stop.
- [ ] Jest helper (global setup/teardown, `afterEach` reset).
- [ ] Playwright fixture.

## 6. Tooling

- [ ] Replace axios with the built-in `fetch` (Node 18+).
- [ ] Replace TSLint with ESLint (typescript-eslint) + Prettier; wire up the existing `.eslintrc.js` and update
      `yarn lint`.
- [ ] Upgrade TypeScript (4.7) and raise `target` from `es2016`.
- [ ] Add CI (GitHub Actions): type check, unit and integration tests on Node 18/20/22.
- [ ] Add a release workflow and a CHANGELOG.

## 7. Documentation

- [x] Write the README: what it is, install, quick start for client and server, builders. (Add test helpers once
      they exist.)
- [x] Document the `decorate` limitation: the function is sent as source text and can't use outer variables or imports.
- [x] Agent Skills in `skills/` (stubs, setup, decorate, GraphQL, faults) plus a Claude Code plugin manifest.
- [ ] Keep `skills/` in sync with the API redesign (section 4) and the bug fixes in section 1: several skills
      describe current pitfalls (silent 400 on `addImposter`, default port 7117, `deleteStub` crash) as workarounds.
- [ ] Decide whether to ship `skills/` in the npm package (needs a `files` change in `package.json`).

## 8. Examples

- [ ] "Fuzzy network" example: proxy to a real backend and add a random delay between a min and max to each
      response, so responses come back out of order. Useful for seeing how an app behaves when several requests are
      in flight and a later one finishes first (stale data, extra re-renders, race conditions). The random delay
      likely needs mountebank's `wait` behavior as an injected function, which requires `allowInjection`.
