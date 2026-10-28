# Saved collection migration

`stores/saved` owns the browser collection, its user-facing storage errors, explicit
`save`, `remove` and `undo` actions, snapshot updates and Undo lifetime. Persistence is
separate from the actions and retains `vndb-explorer:saved:v1`, version 1, snapshots and
original `addedAt` values. Zod checks the stored contract before it is used. Missing
legacy optional display fields remain honestly unknown; malformed or inaccessible data
is never replaced by a later save. State changes only after a successful synchronous
storage write, including snapshot refresh and Undo.

The private Pinia store registers ordinary refs. Its public readonly facade follows the
proved tags-store pattern and preserves real Pinia state/hydration/DevTools metadata.
The `savedNovels` computed getter is itself readonly, so `storeToRefs` also infers a
readonly collection without rebuilding Pinia's getter metadata. Private read/write
helpers are not exposed as actions. Local search and the three existing sorts operate
on readonly entries and produce detached card views, preserving addition order.

VueUse owns the storage-event listener and eight-second Undo timer inside the store's
effect scope. Other tabs update the same consumer state; disposing Pinia stops both
effects. Existing removal/Undo semantics and the date of the original save are retained.

`api/visual-novels` refreshes Saved cards in the existing sequential 50-ID batches via
the one Axios client, validating card DTOs before cache writes and mapping them to the
independent entity. Saved persistence remains independent of the disposable response
cache. `pages/saved` owns local search/sort and refresh lifecycle; an outage leaves the
last-known collection visible, stale provenance remains explicit, and an abandoned or
older refresh cannot update the page. No request is made for each saved row or save action.

`components/saved` owns Save/Saved and the global error/Undo notice. Catalog and Saved
supply the action through the card's slot; the card no longer imports the collection.
The Details screen uses the same action. The old collection module, refresh entry point,
SaveButton and SavedPage entry are removed after moving all consumers. Remaining old UI
and Details compatibility are finished by their respective tickets and final cleanup.

Validation covers legacy records, refused reads/writes, corruption protection, original
Undo dates, snapshot-write failure, readonly state/getters, registered/hydrated Pinia
state, storage updates and scope disposal. The HTTP-boundary test covers multiple
batches and invalid-response retry; browser checks retain Saved journeys and add a
native two-tab synchronization/Undo scenario.

References: [Pinia setup stores](https://pinia.vuejs.org/core-concepts/#setup-stores),
[VueUse useTimeoutFn](https://vueuse.org/shared/useTimeoutFn/),
[VueUse event cleanup](https://vueuse.org/core/useEventListener/).
