# Tag directory migration

`api/tags` loads every directory page through the single Axios/cache boundary and validates
IDs, names, descriptions and searchable flags before caching. The directory entity owns
stable section IDs, section membership and pure local search. Unknown extra response fields
are accepted; missing descriptions retain the existing empty-description fallback.

`stores/tags` owns tags, loading progress, errors and stale provenance. Concurrent actions
share the same complete load, and reopening uses the response cache's existing seven-day
policy. A failed load exposes retry without pretending it was an empty success. Catalog
chips and `components/tags/TagPicker` consume the same store through `storeToRefs`.
Applied filters remain URL-owned and the tag draft remains local to Catalog. Include/Exclude
replacement and toggling use the pure catalog rule; Done still closes without applying.

The private Pinia definition returns ordinary mutable state refs so Pinia registers and
restores them. The public function then exposes `readonly(realStore)`. This avoids returning
readonly refs from a setup store, which Pinia documents as incompatible with state handling.
The derived public type makes state deeply readonly while preserving the real store's
metadata and actions. A narrow assertion bridges Vue's generic readonly inference, which
would otherwise unwrap the private `markRaw` Pinia metadata incorrectly. Tests verify
registered state, preloaded hydration, `$id`, actions, nested mutation prevention and
`storeToRefs` assignment protection. Internal loading helpers are not public actions.

Pinia is installed before Router when the app starts. VueUse's `useEventListener` binds the
native dialog close event and disposes the listener with the picker. The native modal,
focus restoration, keyboard, touch descriptions and visual layout are retained.

The old tag module and generic-UI picker entry were removed after their consumers moved;
there is no parallel directory state or compatibility implementation. Their quality-rule
exceptions and the bootstrap exception are removed. Existing unrelated exceptions remain
scheduled for their owning migration tickets and final cleanup in 11.

References: [Pinia setup stores](https://pinia.vuejs.org/core-concepts/#setup-stores),
[Pinia storeToRefs](https://pinia.vuejs.org/core-concepts/#destructuring-from-a-store),
[VueUse event cleanup](https://vueuse.org/core/useEventListener/),
[VNDB tag fields](https://api.vndb.org/kana#post-tag).
