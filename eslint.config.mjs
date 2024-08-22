import globals from 'globals';
import pluginJs from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
  },
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        // projectService: true,
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  pluginJs.configs.recommended,
  stylistic.configs['recommended-flat'],
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    rules: {
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/semi-style': ['error', 'last'],
      '@stylistic/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'semi',
            requireLast: true,
          },
          singleline: {
            delimiter: 'semi',
            requireLast: true,
          },
          overrides: {
            interface: {
              multiline: {
                delimiter: 'semi',
                requireLast: true,
              },
            },
          },
          multilineDetection: 'brackets',
        },
      ],
      '@stylistic/comma-dangle': [
        'error',
        {
          'objects': 'always',
          'functions': 'never'
        },
      ],
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      quotes: ['error', 'single', { allowTemplateLiterals: true }],
      'no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 0, maxBOF: 0 }],
    },
  },
  {
    files: ['**/*.{mjs}'],
    rules: {
      allowDefaultProject: 'off',
    },
  },
];
