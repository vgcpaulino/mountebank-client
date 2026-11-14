// Release helpers, used by the release workflows (.github/workflows/prepare-release.yml and release.yml).
// Not part of the published package.

export type Bump = 'major' | 'minor' | 'patch';

const semver = /^(\d+)\.(\d+)\.(\d+)$/;
const unreleasedHeading = /^## Unreleased[ \t]*$/m;

/** The next version: `major`, `minor` or `patch` applied to `current`, or an exact `x.y.z` above it. */
export function nextVersion(current: string, request: string): string {
    const parsed = semver.exec(current);
    if (!parsed) {
        throw new Error(`package.json has version "${current}", which isn't x.y.z`);
    }
    const [major, minor, patch] = parsed.slice(1).map(Number);

    let next: string;
    if (request === 'major') next = `${major + 1}.0.0`;
    else if (request === 'minor') next = `${major}.${minor + 1}.0`;
    else if (request === 'patch') next = `${major}.${minor}.${patch + 1}`;
    else if (semver.test(request)) next = request;
    else throw new Error(`"${request}" isn't major, minor, patch or an x.y.z version`);

    if (compare(next, current) <= 0) {
        throw new Error(`the new version ${next} must be above the current ${current}`);
    }
    return next;
}

function compare(a: string, b: string) {
    const [pa, pb] = [a, b].map((v) => v.split('.').map(Number));
    for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
}

/**
 * Turns the `## Unreleased` section into `## [version] - date` and starts a new, empty `## Unreleased` above it.
 * Throws when there is no Unreleased section, when it has no changes, or when the version is already there.
 */
export function releaseChangelog(changelog: string, version: string, date: string): string {
    const heading = unreleasedHeading.exec(changelog);
    if (!heading) {
        throw new Error('CHANGELOG.md has no "## Unreleased" section');
    }
    if (findSection(changelog, version) !== undefined) {
        throw new Error(`CHANGELOG.md already has a section for ${version}`);
    }
    const body = sectionBody(changelog, heading.index + heading[0].length);
    if (!/^- /m.test(body)) {
        throw new Error('the "## Unreleased" section has no entries: nothing to release');
    }

    const before = changelog.slice(0, heading.index);
    const after = changelog.slice(heading.index + heading[0].length);
    return `${before}## Unreleased\n\n## [${version}] - ${date}${after}`;
}

/** The text of the `## [version]` section, without its heading, for the GitHub Release notes. */
export function releaseNotes(changelog: string, version: string): string {
    const notes = findSection(changelog, version);
    if (notes === undefined) {
        throw new Error(`CHANGELOG.md has no "## [${version}]" section`);
    }
    return notes;
}

function findSection(changelog: string, version: string): string | undefined {
    const escaped = version.replace(/\./g, '\\.');
    const heading = new RegExp(`^## \\[${escaped}\\].*$`, 'm').exec(changelog);
    return heading ? sectionBody(changelog, heading.index + heading[0].length) : undefined;
}

/** From `start` to the next `## ` heading (or the end), trimmed. */
function sectionBody(changelog: string, start: number): string {
    const rest = changelog.slice(start);
    const next = /^## /m.exec(rest);
    return (next ? rest.slice(0, next.index) : rest).trim();
}

/** Sets `"version"` in package.json's text, keeping its formatting. */
export function setPackageVersion(packageJson: string, version: string): string {
    const pattern = /^(\s*"version":\s*")[^"]*(")/m;
    if (!pattern.test(packageJson)) {
        throw new Error('package.json has no "version" field');
    }
    return packageJson.replace(pattern, `$1${version}$2`);
}
