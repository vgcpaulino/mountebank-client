import { nextVersion, releaseChangelog, releaseNotes, setPackageVersion } from '../../../scripts/release/changelog';

const changelog = `# Changelog

Intro.

## Unreleased

Changes since 1.0.2.

### Added

- **A thing.**

## [1.0.2] - 2025-02-06

- Older.
`;

describe('nextVersion', () => {
    test.each([
        ['major', '2.0.0'],
        ['minor', '1.1.0'],
        ['patch', '1.0.3'],
        ['1.4.0', '1.4.0'],
    ])('%s from 1.0.2 is %s', (request, expected) => {
        expect(nextVersion('1.0.2', request)).toBe(expected);
    });

    test('rejects anything else, and versions that are not above the current one', () => {
        expect(() => nextVersion('1.0.2', 'huge')).toThrow("isn't major, minor, patch");
        expect(() => nextVersion('1.0.2', '2.0.0-beta.1')).toThrow("isn't major, minor, patch");
        expect(() => nextVersion('1.0.2', '1.0.2')).toThrow('must be above the current 1.0.2');
        expect(() => nextVersion('1.0.2', '0.9.0')).toThrow('must be above');
    });
});

describe('releaseChangelog', () => {
    test('moves Unreleased under the version and starts an empty Unreleased', () => {
        const released = releaseChangelog(changelog, '2.0.0', '2026-11-14');

        expect(released).toContain('## Unreleased\n\n## [2.0.0] - 2026-11-14\n\nChanges since 1.0.2.\n\n### Added');
        expect(released).toContain('## [1.0.2] - 2025-02-06');
        expect(released.startsWith('# Changelog\n\nIntro.\n\n')).toBe(true);
    });

    test('refuses an empty Unreleased section, a missing one, and a version already there', () => {
        const empty = releaseChangelog(changelog, '2.0.0', '2026-11-14');

        expect(() => releaseChangelog(empty, '2.0.1', '2026-11-15')).toThrow('has no entries');
        expect(() => releaseChangelog('# Changelog\n', '2.0.0', '2026-11-14')).toThrow('no "## Unreleased"');
        expect(() => releaseChangelog(changelog, '1.0.2', '2026-11-14')).toThrow('already has a section for 1.0.2');
    });
});

describe('releaseNotes', () => {
    test("returns the version's section without its heading", () => {
        const released = releaseChangelog(changelog, '2.0.0', '2026-11-14');

        expect(releaseNotes(released, '2.0.0')).toBe('Changes since 1.0.2.\n\n### Added\n\n- **A thing.**');
        expect(releaseNotes(released, '1.0.2')).toBe('- Older.');
        expect(() => releaseNotes(released, '3.0.0')).toThrow('no "## [3.0.0]" section');
    });

    test('does not mistake 1.0.20 for 1.0.2', () => {
        expect(() => releaseNotes('## [1.0.20] - x\n\n- a\n', '1.0.2')).toThrow('no "## [1.0.2]"');
    });
});

describe('setPackageVersion', () => {
    test('changes only the version, keeping the formatting', () => {
        const json = '{\n    "name": "x",\n    "version": "1.0.2",\n    "dependencies": { "version": "9" }\n}\n';

        expect(setPackageVersion(json, '2.0.0')).toBe(
            '{\n    "name": "x",\n    "version": "2.0.0",\n    "dependencies": { "version": "9" }\n}\n'
        );
    });
});
