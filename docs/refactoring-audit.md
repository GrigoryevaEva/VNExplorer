# Final migration contract audit

Task 11, 2026-10-29, based on integration a050c1e. This is evidence for review,
not release preparation or permission to publish. Package version remains 0.0.0.

## Architecture and conventions

All consumers use the migrated owners. The last unused modules/vndb client/cache re-exports
are removed. A source import audit covered 107 TypeScript/Vue files, 27 explicit public
barrels and 276 imports: no entity dependency on Vue/Pinia/router/HTTP or upper layers;
no API dependency on stores/pages/components; no shared dependency on domain scenarios;
no public-interface bypass, wildcard export, barrel logic or own-barrel import. HTTP uses
one Axios instance in api/client; api/cache owns the one IndexedDB/session fallback and
request keys, api/client owns in-flight dedup. Saved localStorage is independent.

Entities own pure conditions, presentation and domain types; API owners own schema-derived
DTOs, validation before caching and mapping. Catalog applied conditions stay URL-owned,
with a local draft. Saved and tags use registered private Pinia refs exposed through readonly
public facades, storeToRefs for state and separate actions. Pinia hydration and readonly
behavior have public tests; private persistence/load helpers are not actions.

All migration lint overrides are removed, including the remaining three E2E explicit-any
paths and tag fixture function declaration exception. No rule was weakened. All working
source, tests, scripts and configurations pass I/T, arrow/braces, separate type imports,
import sorting, Vue block order, four-space/semicolon/LF formatting, three-property
destructuring and CSS correctness/property-order checks. Protocol fields/operators, cache
lifetimes, Saved keys/version/messages, store IDs and scenario variants remain with their
owners. Archive/planning/generated exclusions are not migration exemptions.

## Preserved public behavior

| Contract                   | Evidence                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original browser coverage  | All 63 literal baseline test titles from 0fe8767 still exist; parameterized cases plus those titles produced the original 73 scenarios. Current suite runs 81, without skipped scenarios. This ticket changes fixture types/guards only and removes no assertion.                                                                                   |
| Catalog                    | AND/OR/exclusions, local draft/apply, title aliases, sorting/pages, title-only diagnostics, URL restoration, Back/Forward and exact grid scroll remain in catalog/search/language/tag/hidden-search browser suites and public URL tests.                                                                                                            |
| Saved                      | Legacy version-1 snapshots and original addedAt, corruption/read/write refusal, truthful save/remove/Undo, snapshot refresh batches, expired Undo, cross-tab storage events, readonly registered/hydrated state and scope disposal remain covered by saved-store/saved-api and browser Saved/cache suites. No automatic corrupt-record replacement. |
| Response cache             | Actual browser IndexedDB, TTL boundaries (5 minutes/6 hours/7 days), stale provenance/recovery, failed writes, eviction independent of Saved, identical request dedup, independent cancellation and latest-result guards remain covered. Transport tests retain different concurrent schemas and raw DTO transformation isolation.                  |
| Details and safe markup    | Invalid data is retriable rather than an empty success; sparse unknown data stays honest. Source HTML stays text, executable URLs are refused, nesting/code/spoilers/paragraphs and depth limits remain covered through parser, renderer and browser seams.                                                                                         |
| Releases                   | Every manifest page, sequential missing-record batches, multilingual reuse, partial progress/retry, stale per-record validation, complete language groups, per-language MTL, per-novel edition kind and safe distinct websites remain covered through HTTP, mounted component and browser seams.                                                    |
| Screenshots and appearance | Keyboard/touch/cyclic controls, native dialog focus/scroll restoration, late image/close events and disposal remain covered. Task 09 retained six deterministic visual pairs with zero changed pixels. Task 11 changes no runtime UI, styles or assets; production journeys and mobile UI checks still pass.                                        |

No implementation-mirroring or trivial-wrapper tests were added for this cleanup.

## Verification

- npm ci: 453 packages installed, audit reports zero vulnerabilities.
- Vitest: 18 files, 63 tests pass. The first run overlapped full Chromium and hit the
  unchanged five-second release-groups.test.ts test timeout (queues simultaneous language
  expansions and reuses a multilingual release across missing-row retry); the isolated full rerun passes in
  4.17 seconds without altering any assertion or timeout. Avoid resource contention
  when interpreting that initial failure.
- Playwright Chromium: all 81 scenarios pass (1.3 minutes), including original behavior.
- Isolated automation: all 9 process/release-fixture checks pass; only temporary fixture
  repositories consume Changesets or receive tags.
- Production build and root / plus /novels/ smoke pass: direct detail/Saved refresh, full
  journey, catalog history, ten asset responses per base and zero page errors.
- Real bounded browser VNDB probe: seven API requests, all checked responses HTTP 200,
  alias search, two pages, novel details and eleven release records. Timestamp
  2026-10-29T09:38:47.543Z. It verifies current integration/CORS from local origin, not
  future VNDB availability or an unconfigured deployment origin.

External logs, live JSON and screenshots are retained in
C:/Users/Evas/Documents/ChatGPT/VisualNovels/implementation-notes/refactoring/
(ticket11-e2e.log, ticket11-unit.log, ticket11-live.log and ticket11-live/).
The initial concurrent experiment started npm run test:unit and npm run test:e2e on
port 4281 together; 62/63 unit tests passed and the release-group test hit 5000 ms.
The final unit invocation ran alone after Chromium and static checks completed; it is
the valid sequential pipeline result. CI already runs unit before browser checks.
Quality and stable-fixer results are recorded with the completed ticket.

## Remaining gate

The three specified migration parts are ready for final code and human review. Task 12
requires completed human review before version/changelog/archive preparation. No Changesets
were consumed and no tag, push, release or deployment was performed. Historical archives
remain historical; the current refactoring specification and tracker remain authoritative.
