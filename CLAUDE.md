# CLAUDE.md

## What this project is

An npm package that makes [mountebank](https://www.mbtest.dev/) easy to use from TypeScript/JavaScript tests.
Users describe imposters and stubs with fluent builders (`ImposterBuilder`, `StubBuilder`, ...) instead of
writing mountebank's verbose JSON by hand. It is **not** a thin 1:1 wrapper around mountebank's REST API:
the public API should be simpler than mountebank's, and the builders translate to mountebank's format internally.

The planned work lives in [TODO.md](TODO.md). Check it before starting, and update it when an item is done or a new one turns up.

## Scope (do not go beyond this without asking)

- **Protocols:** HTTP, HTTPS and GraphQL (via `mb-graphql`) only. Do not add TCP, SMTP or other protocols.
- **Two ways to use it, both supported:**
  - **Client (core):** talks to any running mountebank server (Docker, CLI, remote). Must not require `mountebank` to be installed.
  - **Server (optional):** starts mountebank inside the Node process. It lives behind its own entry point and
    `mountebank` is an optional peer dependency. Code in the core must never import `mountebank`.
- **Test helpers:** a runner-agnostic core (start / reset / stop) plus thin Jest and Playwright helpers as
  optional entry points. The core must not import Jest or Playwright.
- **Runtime:** Node 18+. Use the built-in `fetch`; do not add HTTP client libraries (axios is being removed).

## API design rules

- **Friendly names in the public API, mapped internally.** E.g. users write `status`, the builder emits
  mountebank's `statusCode`. Keep names consistent across all builders; don't mix the two styles.
- **Breaking changes are allowed until 1.0.** The package is unpublished. Prefer the right design over backwards
  compatibility, and note each breaking change in the changelog once one exists. Don't keep deprecated aliases
  unless asked.
- **No global state for configuration.** Server URL and ports should come from a client instance or explicit
  options; env vars may only provide defaults.
- **Errors must be useful:** include the operation, HTTP status and mountebank's own error message. Never swallow a
  failed response silently.
- **No `console.log` in library code.** Use a logger option or nothing.
- **`decorate` functions are sent to mountebank as source text** (`fn.toString()`) and run inside mountebank.
  They cannot use imports, closures or variables from outside their own body. Keep this in mind in examples and
  docs, and never "refactor" a decorate body to use outer helpers.

## Project layout

- `src/` — library source only. Everything here ships in the package.
- `src/client/` — REST calls to mountebank. `src/builders/` — fluent builders. `src/interfaces/` — types.
  `src/server/` — the optional in-process server.
- `examples/` — runnable demos (e.g. the users-service demo). Never imported by `src/`, never shipped.
- `tests/unit/` and `tests/integration/` — Jest. `tests/e2e/` — Playwright examples (not run by Jest).

## Commands

```bash
yarn install            # yarn is the package manager; never commit package-lock.json
npx tsc --noEmit -p .   # type check
yarn test:unit
yarn test:integration   # starts a real mountebank server on port 2525
yarn format             # Prettier: single quotes, 4-space indent, 120 columns
```

When port 2525 is already taken (a dev server, or a run from another worktree), shift every test port instead of
stopping the other process: `MB_TEST_PORT_OFFSET=1000 yarn test:integration` runs the server on 3525 and imposter
1111 on 2111. Work in a git worktree when the main checkout has someone else's uncommitted changes.

## Definition of done

A change is done only when **all** of these hold:

1. `npx tsc --noEmit -p .` is clean.
2. `yarn test:unit` passes.
3. `yarn test:integration` passes.
4. New behavior and bug fixes come with tests that cover them.

If any of these can't be run, say so explicitly rather than claiming the change is done.

## What Claude may do without asking

- **Allowed:** create feature branches, commit to them, push them and open pull requests.
- **Allowed:** merge your own pull request into `main` (through GitHub, never by pushing to `main`) when it breaks
  none of the "Never" rules below and every check in the Definition of done has passed **locally** first. Always
  run them yourself before merging; don't rely on CI alone.
- **Ask first:** adding, removing or upgrading dependencies; changing `package.json` metadata (name, version,
  license, entry points); deleting files that aren't clearly generated.
- **Never:** commit or push to `main`, force-push, publish to npm, or bump versions for a release.

## Conventions

- Branch names: `feat/...`, `fix/...`, `chore/...`.
- Commit messages: Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`), one logical change per commit.
- Linting is moving from TSLint to ESLint + Prettier; until that lands, don't add new TSLint rules.
