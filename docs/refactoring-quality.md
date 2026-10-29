# Quality checks during the refactor

Use Node.js 24 and the committed npm lockfile. No editor extension or ignored local configuration
is required. The application still uses Vue, Router and Vite; this foundation does not migrate
the domain modules or change the product.

| Command                     | Responsibility                                                                 |
| --------------------------- | ------------------------------------------------------------------------------ |
| `npm run lint`              | Recommended JavaScript/TypeScript/Vue checks, conventions and import ordering  |
| `npm run lint:styles`       | Recommended CSS correctness checks and property ordering, including Vue styles |
| `npm run format:check`      | Prettier formatting of source, tests, scripts and configurations               |
| `npm run typecheck`         | App, tooling, browser/unit tests and scripts, without executing tests          |
| `npm run test:unit`         | Vitest pure-rule and Vue Test Utils component contracts                        |
| `npm run test:e2e`          | Existing deterministic Playwright browser scenarios                            |
| `npm run typecheck:scripts` | Separate strict Node script/process-test types, without executing commands     |
| `npm run test:automation`   | Isolated release CLI and live process lifecycle fixtures                       |
| `npm run test:production`   | Generated root assets plus a separate subpath build; browser production smoke  |
| `npm run test:static`       | Explicit convenience command: build, then test:production                      |

`lint:fix`, `lint:styles:fix` and `format` explicitly write corrections. CI uses only checking
commands. Tests that reach the real VNDB API remain separate opt-in commands; ordinary CI uses
controlled responses. CI and release workflows run the named deterministic commands explicitly; neither invokes live probes.

ESLint uses flat recommended JavaScript, TypeScript and Vue presets. Vue SFC script blocks use
the TypeScript parser inside the Vue parser. Browser globals apply to application code; Node
globals apply to configuration and scripts. Browser tests need both environments because
`page.evaluate` callbacks run in a browser. The script typecheck includes DOM declarations for serialized Playwright callbacks;
script execution itself stays in Node, and browser callbacks receive only serializable inputs. New interfaces use `I`, type aliases use `T`, and
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

## Script execution and isolation

Complex production and live handoff scripts, their lifecycle/temporary-directory helpers and
process tests use native Node 24 TypeScript execution. Native type stripping does not check types
or read tsconfig paths ([Node documentation](https://nodejs.org/docs/latest-v24.x/api/typescript.html)).
`typecheck:scripts` therefore runs a separate strict `tsc --noEmit` configuration with erasable
syntax and explicit `.ts` imports. The small release CLIs and bounded focused live MJS probes remain
JavaScript, covered by lint/format and process or live checks; they have no script lint exemptions.
The script configuration permits those JavaScript imports without claiming to statically typecheck
them. Application code is not imported by the scripts.

The six live commands share owned Vite startup, readiness, logs, port validation, shutdown and
browser request/time limits. Startup waits at most 10 seconds; probes have a 120-second browser
deadline and at most 24 API requests. Tag requests are limited to two records per request and the
tag probe requests only two pages. Browser-side direct fetches also have 15-second deadlines.
An occupied port fails rather than attaching to somebody else's server. The handoff default is
4192: the previous 4190 is a [Fetch-blocked port](https://fetch.spec.whatwg.org/#port-blocking). Browser launch failures
still stop the owned server. Live commands never run in deterministic CI.

`test:automation` invokes the public release CLIs in newly created temporary Git repositories.
Only these fixtures receive tags or consume Changesets. Process tests substitute the external Vite
executable in an owned temporary directory and check startup failure/cleanup without reaching VNDB.
Cleanup accepts no arbitrary deletion path: the captured mkdtemp directory must remain a direct
child of the system temp directory with its owned `vndb-...-` prefix. Git trust is scoped to the
subprocess checkout, never persisted globally. Release package/Git/changelog paths follow the
caller's working directory; the Changesets executable resolves from the installed project.

## Temporary compatibility, removed by task 11

Application code has no remaining ESLint migration exemptions. Task 09 moved the global
cascade to shared UI and scoped component/page styles, with duplicate-selector and
descending-specificity checks enabled everywhere.

These exceptions apply only to explicitly enumerated baseline paths. They do not cover new
files. Remove a file's entry when migrating it, rather than copying exceptions into its new
location. Task 11 removes all remaining compatibility overrides and this migration section.

| Scope                                                                             | Deferred rules and reason                                                                                                                               | Removal                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `tests/e2e/search-navigation.spec.ts`, `tag-combinations.spec.ts`, `tags.spec.ts` | Existing explicit `any` for fixture/request predicates remains until the affected contracts migrate; new tests use inferred or explicit concrete types. | Relevant scenario tasks, finally 11 |
| `tests/e2e/tag-combinations.spec.ts`                                              | Existing helper function declarations.                                                                                                                  | Task 03, finally 11                 |

Baseline before tooling: all 73 Chromium scenarios and production smoke at `/` and `/novels/`
passed on commit `0fe8767`. The new unit/component tests preserve real Catalog URL, safe source
markup and cover fallback contracts; they are not dependency-installation tests.
