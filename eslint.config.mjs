// ESLint: typescript-eslint's strict, type-aware rules (ported from the 2024 `eslint` branch). Formatting is
// Prettier's job (.prettierrc), so eslint-config-prettier turns off every rule that would fight it.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
    globalIgnores([
        'dist/',
        'coverage/',
        'temp/',
        'test-results/',
        'playwright-report/',
        'examples/*',
        '!examples/users-service/',
    ]),
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            globals: globals.node,
            parserOptions: { project: './tsconfig.eslint.json', tsconfigRootDir: import.meta.dirname },
        },
        rules: {
            // From the eslint branch.
            '@typescript-eslint/no-unused-vars': 'error',
            '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/prefer-nullish-coalescing': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
        },
    },
    {
        // Tests assert on untyped JSON from mountebank, and the demo's decorate functions use config.state (typed
        // `any` until it gets a type parameter), so the no-unsafe rules only add noise there. `expect(() => fn())`
        // is the standard Jest pattern for "throws", which no-confusing-void-expression flags.
        files: ['tests/**/*.ts', 'examples/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-confusing-void-expression': 'off',
        },
    },
    {
        files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
        extends: [tseslint.configs.disableTypeChecked],
    },
    prettier
);
