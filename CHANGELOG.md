# Changelog

User-visible changes to `mountebank-client`. The format follows [Keep a Changelog](https://keepachangelog.com/).
The version of the next release is chosen when releasing; until then, changes collect under **Unreleased**.

## Unreleased

Changes since 1.0.2.

### Breaking

- **mountebank is now `@mbtest/mountebank` (`^2.9.5`).** mountebank was renamed after 2.9.1, and the old `mountebank`
  package gets no more releases. If your project installs or imports `mountebank` itself, switch to
  `@mbtest/mountebank`.
- **Node.js 20.19 or later is required** (`engines`), which is mountebank's own minimum.
- **Creating an imposter now throws when mountebank rejects it.** Before, `addImposter()` / `ImposterBuilder.addImposter()`
  quietly ignored a 400 response, for example a port already in use, and the old imposter stayed. They now throw a
  `MountebankError`. To recreate an imposter, call `deleteImposter({ port })` first.
- **Deleting a stub that isn't there now throws a `MountebankError`** ("no stub with ID …") instead of a `TypeError`.
  `deleteStubsByID` throws at the first ID it can't find, where it used to skip the rest silently.
- **All client errors are `MountebankError`s, with new messages.** For example, "Creating the imposter failed (HTTP 400):
  port 8080 is already in use (EADDRINUSE)…" replaces "ERROR: Imposter was NOT created!" and "GENERIC ERROR!". Code
  that matched on the old message text needs updating; check `error.operation` and `error.status` instead.
- **`startMountebank` only accepts connections from this machine by default.** This applies to mountebank's API and to
  every imposter. If a container, VM or another host calls your imposters, pass `allowRemoteConnections: true`.
- **`startMountebank` no longer writes `./mb.log`.** The log now goes to the system temp folder
  (`mountebank-client-<port>.log`), and `getLogs()` keeps working. Pass `logFile: '<path>'` to choose the file, or
  `logFile: false` for none.
- **Only the package root can be imported.** `package.json` now has `exports`, so deep imports such as
  `mountebank-client/dist/builders` fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Import everything from
  `mountebank-client` instead. The dev-only `dist/start` file (shipped in 1.0.2) is no longer published.
- **`startMountebank({ allowInjection: false })` is now honored.** It was ignored before, and injection was always on.
  If you passed `false` but use `decorate` or `chaos`, remove the option.

### Added

- **`chaos` option** on `response()` and `proxyResponse()`: random errors and latency
  (`{ errorRate, errorStatus, latencyRate, maxLatency }`).
  - By default it works on any mountebank version through an injected `decorate`, so injection must be allowed.
    `implementation: 'native'` uses mountebank's own behavior instead (2.9.6+).
  - On a proxy, `chaos` defaults the mode to `proxyTransparent`, and rejects `proxyOnce`.
- **`allowCORS`** option on imposters.
- **`ImposterBuilder.addStubs()`.**
- **`deleteImposter({ port })`**, which does nothing when there's no imposter.
- **`MountebankError`** is exported, with `operation`, `status` and mountebank's `errors`.
- **`startMountebank` options** `logFile` and `allowRemoteConnections`.
- **Agent Skills** for coding agents, in `skills/`. They are shipped in the package and installable with
  `npx skills add vgcpaulino/mountebank-client` or as a Claude Code plugin.

### Changed

- **`package.json` has `repository`, `homepage` and `bugs`**, so npm links back to GitHub.

- **Stubs remember their imposter's port.** `ImposterBuilder.addStub()` / `addStubs()` give a `StubBuilder` without an
  `imposterPort` the imposter's port, so a later `stub.deleteStub()` reaches that imposter instead of port 7117.
- **Importing the package no longer loads mountebank.** It's loaded only when `startMountebank` runs, so the package
  can be imported in Jest.

### Fixed

- **`startMountebank` startup race:** it now waits for the server to listen before creating imposters.
- **`wait` on `response()`** is now passed to mountebank. It was silently dropped before.
