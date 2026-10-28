# VNDB transport and response cache

`api/client` is the single HTTP entry point. Its Axios instance uses the VNDB base URL,
JSON POST requests, no cross-origin credentials, a bounded 30-second timeout and no automatic
retry. `api/protocol` owns request/response types and protocol constants. `api/cache` owns
the existing IndexedDB database and its in-memory fallback; its database/key format is unchanged.

`queryVndb(endpoint, query, options)` validates the envelope with Zod. A scenario supplies its
row schema through `options.schema`; inferred row output is returned to that caller. Validation
runs before mapping or a successful cache write, and again before returning cached data.
Old cache rows that do not satisfy a newly introduced schema are refetched. Required fields
are never replaced with empty defaults. Additional envelope fields are allowed.

The pending-request map shares raw transport across identical request keys. Each caller
validates independently, so a permissive legacy caller cannot bypass another caller's schema.
The cache stores the original DTO envelope, even if a schema strips or transforms fields in
the returned model. A departing caller cancels its own subscription; the shared transport
can finish for other consumers and fill the disposable cache. Cancelled callers receive
no stale notification. Screens retain their generation/abort guards against old responses.

Freshness remains five minutes for Catalog/count, six hours for details/releases and seven
days for tags. Only network, timeout, HTTP 429 and server HTTP failures can use validated
older cached data. Invalid responses, unknown failures and other HTTP failures are not stale
successes. Returned `stale` and `fetchedAt`, plus `onStale`, preserve provenance on screens.
Incomplete release ID batches are not cached as complete answers. Successful per-record
release rows still use this same cache through the compatibility entry point.

`VndbError` distinguishes HTTP, network, timeout, cancellation, invalid response and unknown
failures, retaining the original cause and applicable code/status. It contains technical
context rather than server-provided user text. Presentation selects trusted messages through
`components/vndb-feedback`; scenario-specific count and incomplete-release messages remain
with their consumers. Cancellation has a dedicated predicate and is not displayed as failure.

## Temporary compatibility

`modules/vndb/client.ts` and `cache.ts` only re-export the new implementation. The old query
and response type names also re-export the protocol contracts. They contain no second
transport, request map or cache. Scenario migrations in tasks 03–07 provide their concrete
row schemas; task 11 removes the compatibility entry points after all consumers migrate.
The release-record cache path must validate its concrete rows when migrating in task 07.
Saved localStorage remains independent and is never accessed or cleared by response-cache code.

Tests use MSW at the HTTP boundary and public `queryVndb` calls for validation, cache reuse,
different concurrent schemas, transformation isolation, independent abort, error categories,
timeout and stale behavior. Playwright retains the browser contracts for actual IndexedDB,
TTL, routing, Saved and partial-release retry.

References: [Axios errors](https://axios.rest/pages/advanced/error-handling),
[Axios cancellation](https://axios.rest/pages/advanced/cancellation),
[Zod parsing](https://zod.dev/basics).
