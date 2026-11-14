# Releasing

How a new version of `mountebank-client` gets from `main` to npm. Only maintainers release; coding agents never do
(see [CLAUDE.md](CLAUDE.md)).

## How the CHANGELOG works

[CHANGELOG.md](CHANGELOG.md) follows [Keep a Changelog](https://keepachangelog.com/):

-   Every pull request with a user-visible change adds an entry under **`## Unreleased`**, in the same PR: **Breaking**
    (with what users must do), **Added**, **Changed** or **Fixed**.
-   Nobody picks a version number while working. The version is decided when releasing, from what Unreleased holds:
    anything under Breaking → **major**; otherwise anything under Added → **minor**; otherwise **patch**.
-   Releasing renames `## Unreleased` to `## [x.y.z] - date` and starts a new, empty Unreleased. That section becomes the
    GitHub Release notes, so write entries for users, not for reviewers.

## Releasing a version

1. **Prepare.** On GitHub: Actions → **Prepare release** → Run workflow, with `major`, `minor`, `patch` or an exact
   version such as `2.0.0`. It bumps `package.json`, moves the Unreleased entries under the new version, and opens a
   `chore(release): x.y.z` pull request from `release/vx.y.z`. It refuses to run when Unreleased is empty.
2. **Review.** Check the version and the notes in the pull request. Edit `CHANGELOG.md` on that branch if the notes
   need work. GitHub doesn't run CI for pull requests opened by a workflow; close and reopen the pull request to run
   it, or rely on the release workflow, which runs every check before publishing.
3. **Merge.** Merging changes `package.json` on `main`, which starts **Release**
   ([release.yml](.github/workflows/release.yml)). It:
    1. checks that this version isn't on npm yet (otherwise it stops: nothing to do);
    2. runs the type checks, lint, format check, and the unit, integration and Playwright tests;
    3. waits for approval, if the `npm` environment requires reviewers;
    4. creates the `vx.y.z` tag and the GitHub Release, with the version's CHANGELOG section as notes;
    5. publishes to npm with provenance, through trusted publishing (no token).

If a step fails, fix the cause and re-run the workflow (Actions → Release → Re-run, or Run workflow on `main`). Each
step is safe to repeat: an existing GitHub Release is kept, and a version already on npm stops the run.

## One-time setup

Done once by a maintainer, outside the repository:

1. **npm trusted publishing.** On npmjs.com: package `mountebank-client` → Settings → Trusted publishing → GitHub
   Actions, with owner `vgcpaulino`, repository `mountebank-client`, workflow `release.yml` and environment `npm`.
   No `NPM_TOKEN` secret is needed. Once it works, you can set the package to require trusted publishing and remove
   any old tokens.
2. **The `npm` environment.** On GitHub: Settings → Environments → New environment `npm`. Add yourself as a required
   reviewer to approve every publish by hand (recommended), and limit it to the `main` branch.
3. **Workflow pull requests.** Settings → Actions → General → Workflow permissions: allow GitHub Actions to create
   pull requests, so Prepare release can open its pull request.

## Versions before 2.0

1.0.0 to 1.0.2 were published by hand and have no tags or GitHub Releases. Their CHANGELOG starts with the changes
since 1.0.2.
