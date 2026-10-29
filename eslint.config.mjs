import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/dist-ssr/**',
            '**/coverage/**',
            '**/playwright-report/**',
            '**/test-results/**',
            '**/.playwright/**',
            '**/.worktrees/**',
            '**/.scratch/**',
            '**/.agents/**',
            '**/.codex/**',
            'docs/archive/**',
        ],
    },
    js.configs.recommended,
    ...ts.configs.recommended,
    ...vue.configs['flat/recommended'],
    {
        files: ['**/*.vue'],
        languageOptions: { parserOptions: { parser: ts.parser } },
    },
    {
        files: ['src/**/*.{ts,vue}'],
        languageOptions: { globals: globals.browser },
    },
    {
        files: ['*.{ts,mjs}', 'scripts/**/*.{ts,mjs}', 'tooling/**/*.ts'],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['tests/**/*.ts'],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
    },
    {
        plugins: { 'simple-import-sort': simpleImportSort },
        rules: {
            'simple-import-sort/imports': [
                'error',
                {
                    groups: [
                        ['^\\u0000'],
                        ['^(vue|vue-router|pinia)(/|$|\\u0000)'],
                        ['^@?\\w'],
                        ['^@/'],
                        ['^\\.'],
                    ],
                },
            ],
            'simple-import-sort/exports': 'error',
            curly: ['error', 'all'],
            'no-nested-ternary': 'error',
            'func-style': ['error', 'expression', { allowArrowFunctions: true }],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
            ],
            '@typescript-eslint/naming-convention': [
                'error',
                { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
                { selector: 'typeAlias', format: ['PascalCase'], prefix: ['T'] },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
        },
    },
    // Disable formatting conflicts after all presets and overrides. Re-enable
    // the compatible all-braces convention (Prettier's preset disables curly).
    prettier,
    { rules: { curly: ['error', 'all'] } }
);
