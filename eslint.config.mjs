import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import ts from 'typescript-eslint';

// Explicit baseline files only: new files always receive the target rules.
// Remove this list and the associated override in migration ticket 11.
const legacyFiles = [
    'src/App.vue',
    'src/main.ts',
    'src/app/router.ts',
    'src/modules/catalog/emptySearch.ts',
    'src/modules/catalog/selection.ts',
    'src/modules/saved/collection.ts',
    'src/modules/tags/directory.ts',
    'src/modules/vndb/details.ts',
    'src/modules/vndb/format.ts',
    'src/modules/vndb/releases.ts',
    'src/modules/vndb/saved.ts',
    'src/modules/vndb/types.ts',
    'src/pages/CatalogPage.vue',
    'src/pages/NovelDetailsPage.vue',
    'src/pages/SavedPage.vue',
    'src/ui/CacheNotice.vue',
    'src/ui/CoverImage.vue',
    'src/ui/LanguageFilter.vue',
    'src/ui/NovelCard.vue',
    'src/ui/ReleaseGroups.vue',
    'src/ui/SaveButton.vue',
    'src/ui/ScreenshotGallery.vue',
    'src/ui/ScreenshotImage.vue',
    'src/ui/SourceDescription.ts',
    'src/ui/TagPicker.vue',
];

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
    {
        files: legacyFiles,
        rules: {
            '@typescript-eslint/naming-convention': 'off',
            'func-style': 'off',
            'no-nested-ternary': 'off',
        },
    },
    // Existing standalone MJS utilities are migrated deliberately in ticket 10.
    {
        files: [
            'scripts/changesets.mjs',
            'scripts/check-changeset.mjs',
            'scripts/release-notes.mjs',
            'scripts/smoke-details.mjs',
            'scripts/smoke-handoff-live.mjs',
            'scripts/smoke-language.mjs',
            'scripts/smoke-search-navigation.mjs',
            'scripts/smoke-static.mjs',
            'scripts/smoke-tags.mjs',
            'scripts/smoke-vndb.mjs',
            'scripts/tag-release.mjs',
        ],
        rules: { 'func-style': 'off' },
    },
    {
        files: ['scripts/smoke-static.mjs'],
        rules: { 'no-nested-ternary': 'off' },
    },
    {
        files: ['scripts/smoke-handoff-live.mjs'],
        languageOptions: { globals: { window: 'readonly' } },
    },
    {
        files: [
            'tests/e2e/detail-tags.spec.ts',
            'tests/e2e/saved.spec.ts',
            'tests/e2e/search-navigation.spec.ts',
            'tests/e2e/tag-combinations.spec.ts',
            'tests/e2e/tags.spec.ts',
        ],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['tests/e2e/gallery.spec.ts', 'tests/e2e/tag-combinations.spec.ts'],
        rules: { 'func-style': 'off' },
    },
    {
        files: ['tests/e2e/detail-tags.spec.ts'],
        rules: { 'no-nested-ternary': 'off' },
    },
    // Disable formatting conflicts after all presets and overrides. Re-enable
    // the compatible all-braces convention (Prettier's preset disables curly).
    prettier,
    { rules: { curly: ['error', 'all'] } }
);
