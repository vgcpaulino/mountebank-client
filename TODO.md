# TODO

Roughly in priority order. Boundaries and design rules are in [CLAUDE.md](CLAUDE.md).

## 1. Bugs

- [x] `startMountebank` doesn't await `create()` before adding imposters, so the first `addImposter` can hit a
      server that isn't listening yet (`src/server/mountebankServer.ts`).
- [x] `allowInjection` option is ignored: a hardcoded `'allow-injection': true` overrides it.
- [x] `StubBuilder.response()` dropped the `wait` option, so it never reached mountebank.
- [x] `startMountebank` writes `mb.pid` and `mb.log` into the consumer's working directory and allows connections from
      any IP (`ipWhitelist: ['*']`). Make them options with safe defaults (no files, local only).
      (Only `mb.log` was actually written. Now: log in the temp folder or `logFile`, local-only unless
      `allowRemoteConnections`.)
- [x] `addImposter` silently returns on a 400 (e.g. port already in use). Surface it as an error.
- [x] `deleteStubByID` crashes when the stub ID isn't found (`getStubIndex(undefined)`).
- [x] `StubBuilder.addStub()` uses the default port (7117) unless `imposterPort` is passed; stubs aren't tied to the
      imposter they belong to. (Gone with the client redesign: stubs are added through `client.imposter(port)`.)
- [x] Error messages: `DELETE_STUB` and `GET_LOGS` fall through to `'GENERIC ERROR!'`, and `ADD_IMPOSTER` drops the
      status and response body. Add a dedicated error type with operation, status and mountebank's message.
      (`MountebankError`.)
- [x] `yarn test:integration` passes but Jest doesn't exit ("Jest did not exit one second after...") when its output
      isn't a terminal (redirected, CI), and the `yarn start` mountebank server it spawned is left running. Look at
      `tests/config/globalTeardown.ts` (jest-dev-server only kills `yarn`, not the `ts-node-dev` child).

## 2. Packaging (blocks publishing)

- [x] Package name: `mountebank-client` is already ours on npm (1.0.2 published 2025-02-06).
- [x] Fix `package.json`: `main`/`types` point at `dist/`, `files`, `engines` (Node >= 20.19), a build on
      `prepare`, description, author, keywords.
- [x] Finish `package.json`: add `exports` (decide together with the entry-point split below) and `repository`.
      (Root export only for now; the split adds `./server`, `./jest`, `./playwright`.)
- [x] Fix license mismatch: `package.json` says ISC but `LICENSE` is MIT. (Both MIT now.)
- [x] Split entry points: core (client, builders, reset helpers), `./server` (`startMountebank`, `setupMountebank`),
      `./jest`, `./playwright`.
- [x] Make `@mbtest/mountebank` an optional peer dependency instead of a dependency. (And `mb-graphql`.)
- [ ] Bump `@mbtest/mountebank` to `^2.9.6` once it's released. We stay on the latest stable (2.9.5), which doesn't
      have the native `chaos` behavior: `chaos` defaults to an injected `decorate` that works on 2.9.5, and the
      `implementation: 'native'` integration tests skip themselves below 2.9.6. After the bump, consider making
      `'native'` the default (no injection needed), and update the README and the faults/setup skills.
- [x] Keep the `declare module '@mbtest/mountebank/src/mountebank'` shim (`src/types/mountebank.d.ts`, plus a stale
      copy in the root `index.d.ts` that tsconfig no longer includes) out of consumers' types; keep internal typings
      private to the server entry point, and delete the root copy. (Done: tsc doesn't emit it into `dist/`, no
      published `.d.ts` mentions mountebank, and the root copy is deleted.)
- [x] Exclude `src/start.ts` and other dev-only files from `dist/`. (Moved to `scripts/`.)
- [x] GraphQL with `startMountebank` needs a `protocols.json` in the consumer's working directory (it's read from
      `./protocols.json` and isn't shipped). Generate it or ship it, so GraphQL works without manual setup.
      (Generated in the temp folder when `mb-graphql` is installed; `protofile` option.)

## 3. Project layout

- [x] Move the users-service demo (`src/stubs/`, `src/imposters/`) to `examples/`: it currently ships in `dist/`.
      Update `tests/e2e/users.example.spec.ts`, and the `start:dev` script, which still points at the deleted
      `src/main.ts`. (`examples/` is git-ignored; un-ignore it or pick another folder.)
- [x] Decide what to do with `src/helpers/` (sample imposters): move to `examples/` or delete. (Deleted in #30.)

## 4. API redesign (breaking changes: record each in CHANGELOG.md; the version is chosen at release time)

- [x] Replace the global functions plus env-var defaults with a client instance, e.g.
      `createClient({ url })` → `client.imposter(8080).stub(...)`. (`createClient`, `MountebankClient`,
      `ImposterClient`; builders no longer send anything.)
- [x] Add imposter lifecycle: delete all, get all, replace all stubs on an imposter. (`deleteImposters`,
      `getImposters`, `replaceStubs`; delete one: `deleteImposter`.)
- [x] Add request recording and verification (`recordRequests`, `getRequests` with filters, `clearRequests`;
      the `mountebank-requests` skill shows the assertions).
- [x] Make naming consistent: friendly names everywhere (`status` → `statusCode` mapping already exists; audit the
      rest), and clean up interface names (`IsResponseBuilder` vs `IResponseBuilder`, `IDefaultResponse`).
      (Interfaces renamed; `proxyMode` keeps mountebank's values `proxyAlways` etc., since they match its docs.)
- [x] Remove the deprecated `addDefaultReponse` alias (renamed on main without an alias).
- [x] Type `Config.state` (generic parameter) instead of `any`. (`Config<State>`.)
- [ ] Add a logger option (library code no longer uses `console.*`).

## 4a. Keeping up with mountebank

- [x] Switch from `mountebank` to `@mbtest/mountebank` (renamed in 2.9.2) and require Node 20.19+.
- [x] Support the `chaos` behavior (mountebank 2.9.6): `chaos: { errorRate, errorStatus, latencyRate, maxLatency }`
      on `response()` and `proxyResponse()`.
- [x] Support `allowCORS` on imposters (mountebank 2.9.2).

## 5. Test helpers

- [x] Runner-agnostic core: start server (optional), reset imposters/stubs, stop.
- [x] Jest helper (global setup/teardown, `afterEach` reset).
- [x] Playwright fixture.
- [x] Remove the `jest-dev-server` dev dependency: the integration tests now use the package's own `jestGlobalSetup`.
      (Dependency change: ask first.)

## 6. Tooling

- [x] Replace axios with the built-in `fetch` (available on our Node 20.19+ minimum).
- [x] Replace TSLint with ESLint (typescript-eslint, strict type-aware rules from the old `eslint` branch) + Prettier.
- [x] Upgrade TypeScript (4.7) and raise `target` from `es2016`. (TypeScript 6.0, target ES2022.)
- [ ] Move to TypeScript 7 once ts-jest (<7) and typescript-eslint (<6.1) support it.
- [x] Clear the remaining `no-explicit-any` lint warnings: `Config` (with the typed `Config.state` item above) and
      `Behavior.decorate`.
- [x] Format the 3 files Prettier would still change (`src/index.ts`, `examples/users-service/{imposters,userBuilder}.ts`)
      and add a `format:check` step.
- [x] Add CI (GitHub Actions): type check, unit and integration tests on Node 20 (>= 20.19), 22 and 24.
      (`.github/workflows/ci.yml`: also lint, `format:check` and the Playwright helper tests.)
- [ ] Add a release workflow. (CHANGELOG.md exists; the release moves its "Unreleased" section under the new version.)

## 7. Documentation

- [x] Write the README: what it is, install, quick start for client and server, builders. (Add test helpers once
      they exist.)
- [x] Document the `decorate` limitation: the function is sent as source text and can't use outer variables or imports.
- [x] Agent Skills in `skills/` (stubs, setup, decorate, GraphQL, faults) plus a Claude Code plugin manifest.
- [x] Keep `skills/` in sync with the API redesign (section 4) and the bug fixes in section 1: the skills
      describe the default port 7117 for stubs added on their own; drop it once the client redesign removes it.
- [x] Ship `skills/` in the npm package, so users can install the skills matching their installed version
      (`npx skills add ./node_modules/mountebank-client`, or `npx skills experimental_sync`).

## 8. Examples

- [ ] "Fuzzy network" example: proxy to a real backend and add a random delay between a min and max to each
      response, so responses come back out of order. Useful for seeing how an app behaves when several requests are
      in flight and a later one finishes first (stale data, extra re-renders, race conditions). The random delay
      likely needs mountebank's `wait` behavior as an injected function, which requires `allowInjection`.
