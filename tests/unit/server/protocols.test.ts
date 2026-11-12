import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveProtofile } from '../../../src/server/protocols';

describe('resolveProtofile', () => {
    let dir: string;
    let cwd: string;
    let tempDir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mbc-protocols-'));
        cwd = path.join(dir, 'project');
        tempDir = path.join(dir, 'tmp');
        fs.mkdirSync(cwd);
        fs.mkdirSync(tempDir);
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    const graphqlAt = (entry: string) => () => entry;
    const noGraphql = () => undefined;

    test('false loads no custom protocols', () => {
        expect(
            resolveProtofile({ protofile: false, port: 2525, cwd, tempDir, resolveGraphql: graphqlAt('/x.js') })
        ).toBe(undefined);
    });

    test('a given path is used as is, relative to the working directory', () => {
        expect(resolveProtofile({ protofile: 'config/protocols.json', port: 2525, cwd, tempDir })).toBe(
            path.join(cwd, 'config/protocols.json')
        );
    });

    test('./protocols.json in the working directory wins over a generated one', () => {
        fs.writeFileSync(path.join(cwd, 'protocols.json'), '{}');

        expect(resolveProtofile({ port: 2525, cwd, tempDir, resolveGraphql: graphqlAt('/x.js') })).toBe(
            path.join(cwd, 'protocols.json')
        );
    });

    test('without mb-graphql and without ./protocols.json, there is none', () => {
        expect(resolveProtofile({ port: 2525, cwd, tempDir, resolveGraphql: noGraphql })).toBe(undefined);
    });

    test('with mb-graphql installed, generates one in the temp folder that runs it with this Node', () => {
        const file = resolveProtofile({
            port: 2600,
            cwd,
            tempDir,
            resolveGraphql: graphqlAt('/deps/mb-graphql/index.js'),
        });

        expect(file).toBe(path.join(tempDir, 'mountebank-client-2600-protocols.json'));
        const command = (JSON.parse(fs.readFileSync(file as string, 'utf8')) as { graphql: { createCommand: string } })
            .graphql.createCommand;
        const node = process.execPath.includes(' ') ? 'node' : process.execPath;
        expect(command).toBe(`${node} /deps/mb-graphql/index.js`);
        expect(fs.existsSync(path.join(cwd, 'protocols.json'))).toBe(false); // nothing written into the project
    });

    test('a path with a space goes through a wrapper, because mountebank splits the command on spaces', () => {
        const entry = '/My Projects/node_modules/mb-graphql/dist/index.js';
        const file = resolveProtofile({ port: 2601, cwd, tempDir, resolveGraphql: graphqlAt(entry) });

        const command = (JSON.parse(fs.readFileSync(file as string, 'utf8')) as { graphql: { createCommand: string } })
            .graphql.createCommand;
        const wrapper = path.join(tempDir, 'mountebank-client-2601-mb-graphql.js');
        expect(command.endsWith(` ${wrapper}`)).toBe(true);
        expect(fs.readFileSync(wrapper, 'utf8')).toBe(`require(${JSON.stringify(entry)});\n`);
    });
});
