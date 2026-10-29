# Release language group migration

`api/releases` owns the light manifest and detail requests, DTO schemas, mapping and per-record
response cache policy. Every manifest page is loaded. Detail response rows are validated before
mapping and before successful cache writes; individual legacy cached records are revalidated
and matched to their requested ID before either fresh reuse or stale fallback. The existing
record keys and six-hour freshness remain compatible. Raw DTOs stay in the cache rather than
camelCase domain models. A malformed cached record is refetched, never served as stale data.

The adapter requires core ID/title/official data. Existing sparse optional metadata remains
supported: absent date/minimum age become unknown, absent collection metadata becomes empty,
and unknown patch/MTL flags remain null rather than invented false values. Present arrays,
flags and item fields must have the right types. New response properties are tolerated. Native
custom abort reasons are normalized to a typed cancellation with the original cause; leaving
one request consumer still does not cancel shared transport.

`entities/release` owns language grouping, edition labels, minimum age, planned status,
platform/language names, safe distinct websites and date ordering. Machine translation is
per language; demo/partial is per novel association. No languages, unofficial editions or
release kinds are filtered out. Sorting creates a view without mutating its input. Common
partial-date formatting moved as an actual implementation to `shared/utils/dates`, used by
novel and release UI without cross-entity dependency or a forwarding wrapper.

`components/releases/ReleaseGroups` composes presentation and a local lifecycle/queue
composable. Groups begin closed. Simultaneous expansions enter one queue; each group loads
all missing IDs in sequential batches, reusing already loaded multilingual rows. Successful
rows survive a partial failure, the progress remains visible and retry asks only for missing
records. Fresh records and closed/reopened groups do not reload. Stale provenance remains
visible on affected language groups. `ReleaseRow` renders dates, age, edition labels, platforms
and one/multiple safe external sites, falling back to plain text when no suitable site exists.

The old release module, release component and final release-only formatter compatibility
entry are removed. Their exact baseline quality exceptions are removed; task 11 completed
the remaining migration cleanup.

Tests exercise public HTTP/cache boundaries, the mounted component with actual HTTP requests,
and pure release presentation. The mounted Node test explicitly selects Axios's real HTTP
adapter because MSW's Node server intercepts HTTP while jsdom supplies rendering lifecycle;
no application module or queue collaborator is mocked. Browser checks keep the native
browser transport and existing desktop/mobile contracts.

Reference: [VNDB release fields](https://api.vndb.org/kana#post-release).
