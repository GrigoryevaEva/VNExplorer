# Novel details migration

`api/visual-novels` validates detail rows before mapping or writing a successful response cache.
The independent `entities/visual-novel` model uses `voteCount`, `playTimeMinutes`, `lengthCategory`,
title language/romanization and screenshot thumbnail dimensions without importing the HTTP DTO.
Pure presentation owns alternative-title deduplication, spoiler association filtering, approximate
play time, rating and dates. A missing novel is `null`; a failed or invalid response throws.
Invalid parsed dates (for example a month of 13) produce the existing unknown-date label rather
than throwing during rendering; valid partial and complete date formatting remains unchanged.

## Accepted unknown-data contract

VNDB normally includes selected fields. The application adapter deliberately preserves the prior
public contract for sparse metadata as well: absent description, votes and play-time information
become explicit unknown values; absent title/alias/tag/screenshot collections mean no available
metadata. This tolerance is separate from the server's selected-field guarantee, and preserves
existing unknown-data behavior and old cache entries. It does not manufacture a title or ID.
Those two core fields remain required. A present collection must be an array; null collections,
wrong field types and missing required item data are rejected rather than displayed as empty.

A tag association's omitted/null spoiler level becomes `null`, never zero. Only explicit level
zero is displayed. Present levels must be the documented integers zero through two. IDs/names
are required. Screenshot items require their ID, URLs and both integer dimension pairs; title
items require their selected fields. Additional server fields are tolerated.

`pages/novel-details` owns loading, route changes, abort guards, stale provenance, catalog return
and single-tag navigation. Its composable leaves presentation components free of HTTP. Clicking
a displayed tag creates default catalog conditions with only that tag. Saved uses the existing
Pinia action component. The page's layout, reading order and uncropped cover are unchanged.

`shared/utils/source-markup` parses the existing BBCode vocabulary into a plain tree without Vue.
It retains same-tag nesting, raw/code literals, paragraph breaks inside formatting and spoilers,
the depth limit and HTTP(S)-only links. The script-setup renderer in `shared/ui/source-description`
creates escaped Vue nodes; source HTML is never interpreted. Consumers supply the link base URL:
VNDB's site URL belongs to `api/protocol`, so shared code has no VNDB dependency. Both novel and
tag descriptions use this renderer. There is no new markup language or product capability.

The old detail/description implementations and unused catalog compatibility entries are removed.
The gallery consumes the entity screenshot type directly (full lifecycle migration is task 08).
`modules/vndb/format.ts` only re-exports pure presentation for the legacy release component until
task 07; it contains no second formatter or model. Remaining unrelated quality exceptions stay
with their owning tasks and are removed completely in 11.

Tests cover the public details HTTP boundary, pure presentation/parser contracts, existing safe
description rendering, browser tag/keyboard/touch/history behavior and an abandoned request
finishing after a newer novel has opened.

The full run exposed an existing TTL-test timing dependency: `clock.install` plus a 298-second
advance left only two seconds of real scheduling slack before expiry, and the fresh-cache request
assertion observed two requests instead of one. The test now fixes Date at explicit 4:59 and 5:01
boundaries; all original request, stale and recovery assertions remain. Product cache code did
not change. The original failure trace/context are retained outside the repository in
`implementation-notes/refactoring/ticket06-ttl-evidence`.

Reference: [VNDB visual novel fields](https://api.vndb.org/kana#post-vn).
