# TODO

Roughly in priority order. Boundaries and design rules are in [CLAUDE.md](CLAUDE.md).

## 1. Bugs

- [ ] `startMountebank` doesn't await `create()` before adding imposters, so the first `addImposter` can hit a
      server that isn't listening yet (`src/server/mountebankServer.ts`).
- [ ] `allowInjection` option is ignored: a hardcoded `'allow-injection': true` overrides it.
- [ ] `startMountebank` writes `mb.pid` and `mb.log` into the consumer's working directory and allows connections from
      any IP (`ipWhitelist: ['*']`). Make them options with safe defaults (no files, local only).
- [ ] `addImposter` silently returns on a 400 (e.g. port already in use). Surface it as an error.
- [ ] `deleteStubByID` crashes when the stub ID isn't found (`getStubIndex(undefined)`).
- [ ] `StubBuilder.addStub()` uses the default port (7117) unless `imposterPort` is passed; stubs aren't tied to the
      imposter they belong to.
- [ ] Error messages: `DELETE_STUB` and `GET_LOGS` fall through to `'GENERIC ERROR!'`, and `ADD_IMPOSTER` drops the
      status and response body. Add a dedicated error type with operation, status and mountebank's message.

## 2. Packaging (blocks publishing)

- [ ] Pick a package name: `mountebank-client` is taken on npm. Free as of 2026-11-12: `mountebank-builder`,
      `mountebank-fluent`, `mb-builder`.
- [ ] Fix `package.json`: `main`/`types`/`exports` point at `dist/`, add `files`, `engines: { node: ">=18" }`,
      `prepublishOnly` build, description, author, repository, keywords. Reset version to `0.x`.
- [ ] Fix license mismatch: `package.json` says ISC but `LICENSE` is MIT.
- [ ] Split entry points: core client/builders (no `mountebank` import), `./server` (in-process server), `./jest`
      and `./playwright` helpers.
- [ ] Make `mountebank` an optional peer dependency instead of a dependency.
- [ ] Stop relying on the `declare module 'mountebank/src/mountebank'` shim in `index.d.ts` leaking into consumers'
      types; keep internal typings private to the server entry point.
- [ ] Exclude `src/start.ts` and other dev-only files from `dist/`.

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
- [ ] Remove the deprecated `addDefaultReponse` alias.
- [ ] Type `Config.state` (generic parameter) instead of `any`.
- [ ] Add a logger option; no `console.*` in library code.

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

- [ ] Write the README: what it is, install, quick start for client and server, builders, test helpers.
- [ ] Document the `decorate` limitation: the function is sent as source text and can't use outer variables or imports.
