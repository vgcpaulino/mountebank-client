// Command line for the release workflows. Run from the repository root:
//
//   node --require ts-node/register/transpile-only scripts/release/cli.ts prepare <major|minor|patch|x.y.z>
//       bumps package.json, moves CHANGELOG.md's Unreleased section under the new version, prints the version
//   node --require ts-node/register/transpile-only scripts/release/cli.ts notes <x.y.z>
//       prints that version's CHANGELOG.md section (the GitHub Release notes)
import { readFileSync, writeFileSync } from 'fs';
import { nextVersion, releaseChangelog, releaseNotes, setPackageVersion } from './changelog';

const [command, argument] = process.argv.slice(2);

function main() {
    if (command === 'prepare' && argument) {
        const packageJson = readFileSync('package.json', 'utf8');
        const current = (JSON.parse(packageJson) as { version: string }).version;
        const version = nextVersion(current, argument);
        const date = new Date().toISOString().slice(0, 10);

        writeFileSync('CHANGELOG.md', releaseChangelog(readFileSync('CHANGELOG.md', 'utf8'), version, date));
        writeFileSync('package.json', setPackageVersion(packageJson, version));
        process.stdout.write(`${version}\n`);
        return;
    }
    if (command === 'notes' && argument) {
        process.stdout.write(`${releaseNotes(readFileSync('CHANGELOG.md', 'utf8'), argument)}\n`);
        return;
    }
    throw new Error('usage: cli.ts prepare <major|minor|patch|x.y.z> | cli.ts notes <x.y.z>');
}

try {
    main();
} catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
}
