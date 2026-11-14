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
   need work. GitHub doesn't run CI for pull requests opened by a workflow: the pull request shows a CI run marked as
   failed with no jobs, which you can ignore. Close and reopen the pull request to run CI for real, or rely on the
   release workflow, which runs every check before publishing.
3. **Merge.** Merging changes `package.json` on `main`, which starts **Release**
   ([release.yml](.github/workflows/release.yml)). It:
    1. checks that this version isn't on npm yet (otherwise it stops: nothing to do);
    2. runs the type checks, lint, format check, and the unit, integration and Playwright tests;
    3. waits for approval, if the `npm` environment requires reviewers;
    4. creates the `vx.y.z` tag and the GitHub Release, with the version's CHANGELOG section as notes;
    5. publishes to npm with provenance, through trusted publishing (no token).
4. **Approve on npm.** npm stages the version instead of releasing it: the job logs `+ mountebank-client@x.y.z`, but
   the version isn't installable yet. On npmjs.com, open your account menu → **Staged Packages** and approve it (with
   2FA). It then becomes `latest`.

If a step fails, fix the cause and re-run the workflow (Actions → Release → Re-run failed jobs, or Run workflow on
`main`). Each step is safe to repeat: an existing GitHub Release is kept, and a version already on npm stops the run.

A publish that fails with `E404 Not Found - PUT https://registry.npmjs.org/mountebank-client` means npm rejected the
trusted publisher: the configuration on npmjs.com is missing, doesn't match (owner, repository, workflow file name,
environment) or doesn't allow `npm publish`. Fix it there, then re-run the failed job.

## One-time setup

Done once by a maintainer, outside the repository:

1. **npm trusted publishing.** On npmjs.com, open the package page
   ([npmjs.com/package/mountebank-client](https://www.npmjs.com/package/mountebank-client)) → **Settings** tab
   (only visible to owners) → **Trusted Publisher** → GitHub Actions:

    - owner `vgcpaulino`, repository `mountebank-client`, workflow `release.yml` (file name only), environment `npm`;
    - under allowed actions, tick **npm publish**: new configurations only allow `npm stage publish` by default.

    npm doesn't check the configuration when you save it; a mistake shows up as the `E404` above. A new configuration
    expires if nothing is published through it within 2 days, so add it shortly before the first release. It can't be
    edited: to change it, delete it and add it again. No `NPM_TOKEN` secret is needed. Under **Publishing access**,
    choose "Require two-factor authentication and disallow bypass 2fa tokens": trusted publishing still works, and
    tokens can no longer publish.

2. **The `npm` environment.** On GitHub: Settings → Environments → New environment `npm`. Add yourself as a required
   reviewer to approve every publish by hand (recommended), and limit it to the `main` branch.
3. **Workflow pull requests.** Settings → Actions → General → Workflow permissions: allow GitHub Actions to create
   pull requests, so Prepare release can open its pull request.

## Versions before 2.0

1.0.0 to 1.0.2 were published by hand and have no tags or GitHub Releases. 2.0.0 is the first version released by
these workflows; its CHANGELOG section lists the changes since 1.0.2.
