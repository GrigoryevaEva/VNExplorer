# Quality checks during the refactor

Use Node.js 24 and the committed npm lockfile. No editor extension or ignored local configuration
is required. The application still uses Vue, Router and Vite; this foundation does not migrate
the domain modules or change the product.

| Command                | Responsibility                                                                 |
| ---------------------- | ------------------------------------------------------------------------------ |
| `npm run lint`         | Recommended JavaScript/TypeScript/Vue checks, conventions and import ordering  |
| `npm run lint:styles`  | Recommended CSS correctness checks and property ordering, including Vue styles |
| `npm run format:check` | Prettier formatting of source, tests, scripts and configurations               |
| `npm run typecheck`    | App, configuration/tooling and test types, without executing tests             |
| `npm run test:unit`    | Vitest pure-rule and Vue Test Utils component contracts                        |
| `npm run test:e2e`     | Existing deterministic Playwright browser scenarios                            |
| `npm run test:static`  | Production build and browser smoke for root/subpath hosting                    |

`lint:fix`, `lint:styles:fix` and `format` explicitly write corrections. CI uses only checking
commands. Tests that reach the real VNDB API remain separate opt-in commands; ordinary CI uses
controlled responses. The release workflow continues its existing checks; script/workflow
consolidation belongs to task 10.

ESLint uses flat recommended JavaScript, TypeScript and Vue presets. Vue SFC script blocks use
the TypeScript parser inside the Vue parser. Browser globals apply to application code; Node
globals apply to configuration and scripts. Browser tests need both environments because
`page.evaluate` callbacks run in a browser. The live handoff script additionally declares only
`window` for its existing browser callbacks. New interfaces use `I`, type aliases use `T`, and
type imports are separate. The only import sorter is `simple-import-sort`: side effects retain
their order, then Vue/Router/Pinia, other packages, `@/` imports and relative imports. The
Prettier conflict-disabling ESLint preset follows the other presets and conventions. A final
compatible `curly: ['error', 'all']` override reinstates mandatory braces, which that preset
otherwise disables. The all-braces mode does not compete with Prettier formatting.

Prettier uses strict HTML whitespace sensitivity to preserve source text between Vue tags.
It owns whitespace, quotes, semicolons and the agreed three-property destructuring
threshold. Standard Prettier collapses short object patterns, including parameter patterns,
regardless of `objectWrap`. The small typed `tooling/prettier-destructuring.ts` extension reuses
the standard ESTree printer and forces only its existing object-pattern document to break
when it has three or more properties. It works in TypeScript, JavaScript and embedded Vue
scripts, preserving standard comments/types/rest-property handling. There is no competing
ESLint whitespace fixer. Tests cover variables, arrow/function parameters, type annotations,
aliases/rest, Vue, compact two-property patterns and second-pass stability.

Stylelint parses ordinary CSS and Vue with `postcss-html`, with recommended correctness
checks as well as property groups: position, layout, sizing/spacing, typography, decoration,
effects. BEM-style element/modifier class names and Vue deep/global/slotted selectors are
supported. No SCSS or CSS framework is added.

Vite owns the `@/` alias and Vitest merges that configuration. TypeScript uses the same
`src/` target. Vitest collects only `tests/unit/**/*.test.ts`, independently of Playwright.
It defaults to Node; component files opt into jsdom with an environment annotation.
`tsconfig.tests.json` checks both browser and unit tests without running either.

Generated files, dependencies, worktrees, local agent planning and historical archives are
excluded from the tools. Prettier also excludes generated `package-lock.json` and local
agent/domain instructions; tracked application/configuration files remain covered. LF is
enforced by Prettier and `.gitattributes`.

## Temporary compatibility, removed by task 11

These exceptions apply only to explicitly enumerated baseline paths. They do not cover new
files. Remove a file's entry when migrating it, rather than copying exceptions into its new
location. Task 11 removes all remaining compatibility overrides and this migration section.

| Scope                                                                                                                                                                                                                                                                                           | Deferred rules and reason                                                                                                                                                                                                                             | Removal                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| The 4 remaining explicit baseline paths in `legacyFiles` in `eslint.config.mjs`: `src/app/router.ts`, the remaining `src/ui` files. Migrated API, Catalog, tags, Saved, Details, source markup, card/release contracts, app notice composition and bootstrap code no longer receive exemptions. | I/T naming, function expressions and nested ternaries. Renaming public contracts and restructuring scenario logic belongs to their migration ticket. Recommended correctness rules, braces, type imports, import order and formatting are active now. | Tasks 03–09, finally 11             |
| Eleven explicit existing `scripts/*.mjs` paths enumerated in ESLint configuration                                                                                                                                                                                                               | Function declarations remain until deliberate utility migration; no exemption for newly added MJS files.                                                                                                                                              | Task 10, finally 11                 |
| `scripts/smoke-static.mjs`                                                                                                                                                                                                                                                                      | Its existing nested route/MIME ternary remains pending script migration.                                                                                                                                                                              | Task 10                             |
| `tests/e2e/search-navigation.spec.ts`, `tag-combinations.spec.ts`, `tags.spec.ts`                                                                                                                                                                                                               | Existing explicit `any` for fixture/request predicates remains until the affected contracts migrate; new tests use inferred or explicit concrete types.                                                                                               | Relevant scenario tasks, finally 11 |
| `tests/e2e/tag-combinations.spec.ts`                                                                                                                                                                                                                                                            | Existing helper function declarations.                                                                                                                                                                                                                | Task 03, finally 11                 |
| `src/styles/theme.css`                                                                                                                                                                                                                                                                          | Descending specificity and duplicate selector checks are temporarily disabled to preserve the existing global cascade while it is separated into UI owners. All other recommended checks and property ordering are active.                            | Task 09, finally 11                 |

Baseline before tooling: all 73 Chromium scenarios and production smoke at `/` and `/novels/`
passed on commit `0fe8767`. The new unit/component tests preserve real Catalog URL, safe source
markup and cover fallback contracts; they are not dependency-installation tests.
