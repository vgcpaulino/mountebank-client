import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface ProtofileOptions {
    /** The `protofile` option given to `startMountebank`. */
    protofile?: string | false;
    /** mountebank's API port, used to name the generated file. */
    port: number;
    /** Where `./protocols.json` is looked for. Defaults to the working directory. */
    cwd?: string;
    /** Finds mb-graphql's entry point, or returns undefined when it isn't installed. */
    resolveGraphql?: () => string | undefined;
    /** Where generated files go. Defaults to the system temp folder. */
    tempDir?: string;
}

/**
 * Picks the protocols file mountebank loads custom protocols (GraphQL) from:
 * - `protofile: '<path>'`: that file. `protofile: false`: none.
 * - Otherwise `./protocols.json`, when the working directory has one (an existing setup keeps working).
 * - Otherwise, when mb-graphql is installed, a file generated in the temp folder that points at it, so GraphQL
 *   imposters work without any setup.
 */
export function resolveProtofile({
    protofile,
    port,
    cwd = process.cwd(),
    resolveGraphql = resolveInstalledGraphql,
    tempDir = os.tmpdir(),
}: ProtofileOptions): string | undefined {
    if (protofile === false) {
        return undefined;
    }
    if (protofile !== undefined) {
        return path.resolve(cwd, protofile);
    }

    const local = path.join(cwd, 'protocols.json');
    if (fs.existsSync(local)) {
        return local;
    }

    const graphqlEntry = resolveGraphql();
    if (graphqlEntry === undefined) {
        return undefined;
    }

    const generated = path.join(tempDir, `mountebank-client-${port}-protocols.json`);
    fs.writeFileSync(
        generated,
        JSON.stringify({ graphql: { createCommand: graphqlCommand(graphqlEntry, tempDir, port) } }, null, 4)
    );
    return generated;
}

/**
 * mountebank splits `createCommand` on spaces, so neither part may contain one. Node's own path is used when it
 * has none (otherwise `node` from the PATH), and mb-graphql's entry point is reached through a small wrapper in the
 * temp folder when its path has a space.
 */
function graphqlCommand(graphqlEntry: string, tempDir: string, port: number) {
    const node = process.execPath.includes(' ') ? 'node' : process.execPath;
    let script = graphqlEntry;
    if (script.includes(' ')) {
        script = path.join(tempDir, `mountebank-client-${port}-mb-graphql.js`);
        fs.writeFileSync(script, `require(${JSON.stringify(graphqlEntry)});\n`);
    }
    return `${node} ${script}`;
}

function resolveInstalledGraphql(): string | undefined {
    try {
        return require.resolve('mb-graphql');
    } catch {
        return undefined;
    }
}
