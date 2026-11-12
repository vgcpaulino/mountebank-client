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
    `@mbtest/mountebank` is an optional peer dependency. Code in the core must never import mountebank at load
    time (it pulls in ES-module-only packages that Jest can't load); `startMountebank` loads it lazily.
- **Test helpers:** a runner-agnostic core (start / reset / stop) plus thin Jest and Playwright helpers as
  optional entry points. The core must not import Jest or Playwright.
- **mountebank package:** `@mbtest/mountebank` (the old `mountebank` package stopped at 2.9.1). Stay on its latest
  stable release; no betas. A local clone for reading its source can live in `temp/mountebank` (git-ignored);
  never import from it.
- **Runtime:** Node 20.19+ (mountebank's own minimum); `.nvmrc` pins 22 for development. Use the built-in `fetch`;
  do not add HTTP client libraries (axios is being removed).

## API design rules

- **Friendly names in the public API, mapped internally.** E.g. users write `status`, the builder emits
  mountebank's `statusCode`. Keep names consistent across all builders; don't mix the two styles.
- **Breaking changes are allowed, but every one is recorded.** `mountebank-client` 1.0.2 is published, and the
  version of the next release is decided when releasing, not up front. Any change that can break existing users
  (a removed or renamed API, a changed default, a new error where there was none, a higher minimum Node or
  mountebank version) gets an entry under **Unreleased → Breaking** in [CHANGELOG.md](CHANGELOG.md), in the same
  PR, saying what changed and what users must do. Other user-visible changes go under Added / Changed / Fixed.
  Prefer the right design over backwards compatibility; don't keep deprecated aliases unless asked.
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
- `examples/users-service/` — the tracked demo (`yarn start:dev`). Other files in `examples/` are personal and
  git-ignored. Never imported by `src/`, never shipped.
- `scripts/` — dev tooling such as `start-mountebank.ts` (`yarn start`, and the integration tests' server). Not
  shipped: only `src/` is built into `dist/`.
- `tests/unit/` and `tests/integration/` — Jest. `tests/e2e/` — Playwright examples (not run by Jest).
- `skills/` — Agent Skills for people using the package. They use the open `SKILL.md` format
  ([agentskills.io](https://agentskills.io)) and must work in any agent that supports it, not just Claude Code: use
  only the standard frontmatter (`name`, `description`), no agent-specific tools or wording. They ship in the npm package
  (`files` in `package.json`) and install with `npx skills add` (any agent, from GitHub or `node_modules`) or as a
  Claude Code plugin via `.claude-plugin/`. They document the public API and
  its current pitfalls, and must stay in sync with it (see below).

## Commands

```bash
nvm use                 # Node 22 from .nvmrc
yarn install            # yarn is the package manager; never commit package-lock.json
npx tsc --noEmit -p .   # type check
yarn test:unit
yarn test:integration   # starts a real mountebank server on port 2525; port must be free, or it waits for a prompt
yarn format             # Prettier: single quotes, 4-space indent, 120 columns
```

When port 2525 is already taken (a dev server, or a run from another worktree), shift every test port instead of
stopping the other process: `MB_TEST_PORT_OFFSET=1000 yarn test:integration` runs the server on 3525 and imposter
1111 on 2111.

## Worktrees

- Work in a git worktree under `temp/` (git-ignored), e.g. `git worktree add -b fix/x temp/wt-x origin/main`, when
  the main checkout has someone else's uncommitted changes or another task is in progress there.
- **Once a PR is merged, delete its branches and worktree.** Confirm the merge first (`gh pr view <number> --json state`
  says `MERGED`), then delete the remote branch, the worktree and the local branch:

  ```bash
  git merge-base --is-ancestor origin/fix/x origin/main   # the branch tip must be on main (exit code 0)
  git push origin --delete fix/x
  git worktree remove temp/wt-x   # refuses if the worktree has uncommitted or untracked changes
  git branch -d fix/x             # refuses if the branch isn't merged
  git worktree prune
  ```

  If any check or command refuses, stop and ask instead of forcing it (never `--force` or `-D`): the branch or
  worktree has work that isn't on `main`. Remote branches can be restored from the PR page on GitHub.
- With stacked PRs, keep a branch until every PR built on it is merged; a worktree that switched branches (e.g. from
  #35's branch to #36's) is removed after the last one.
- Never delete branches that have no merged PR (e.g. `eslint`, `feat/redis`): they may hold unmerged work. Note that
  `git branch -d` also deletes a branch that is only merged into its *remote* copy, so check `git branch --merged main`
  first when deleting more than the branch you just merged.

## Keeping the skills in sync

The skills are documentation that coding agents follow literally, so a stale skill makes agents write broken code.
**Any change to public behavior updates the affected skills in the same change** (same PR), along with the README.
That includes new options, renamed or removed APIs, changed defaults, fixed bugs that a skill documents as a pitfall
or workaround, and a new minimum mountebank or Node version.

Which skill covers what:

| Area of the change                                                                 | Skill                 |
| ---------------------------------------------------------------------------------- | --------------------- |
| `ImposterBuilder`, `StubBuilder` matching and responses, `copyFrom…`, deleting stubs/imposters, `getImposter(s)` / `deleteImposters` / `replaceStubs` / `getLogs`, `MountebankError` | `mountebank-stubs`    |
| `startMountebank`, env vars, client URLs/ports, Docker/CLI, test-runner wiring, troubleshooting | `mountebank-setup`    |
| `decorate`, `Config`, `config.state`                                               | `mountebank-decorate` |
| `wait`, `chaos`, `multipleResponses`, default responses, `proxyResponse`            | `mountebank-faults`   |
| GraphQL imposters, `any()`, `protocols.json`, `mb-graphql`                          | `mountebank-graphql`  |
| `recordRequests`, `getRequests` / `clearRequests`, request filters                   | `mountebank-requests` |

When updating a skill:

- Search all skills for the old name or behavior (`grep -rn` in `skills/`). Pitfalls are often repeated in
  `mountebank-setup`'s troubleshooting table.
- When a bug fix removes a pitfall, delete the warning and its workaround; don't leave "this used to…" notes.
- Keep examples compiling against the current API, and keep each `description` in the frontmatter accurate, since
  it decides when the skill is used.
- If a change adds a new area no skill covers, extend the closest skill or add a new one and list it here.

## Definition of done

A change is done only when **all** of these hold:

1. `npx tsc --noEmit -p .` is clean.
2. `yarn test:unit` passes.
3. `yarn test:integration` passes.
4. New behavior and bug fixes come with tests that cover them.
5. Skills and README match the change (see "Keeping the skills in sync"), or the change doesn't touch public
   behavior.
6. User-visible changes have a CHANGELOG.md entry under "Unreleased", and breaking ones are under "Breaking".

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
