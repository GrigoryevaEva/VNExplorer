# Catalog migration

`entities/catalog` owns independent conditions, variants, defaults and reset rules. The applied
conditions remain in the URL; `pages/catalog/route` converts them without importing a screen.
`api/catalog` compiles VNDB predicates and requests exact title-match counts. Its card schema
validates rows before successful caching; the mapper produces the independent visual novel model.

`pages/catalog` composes the screen with a local pagination component. `useCatalog` coordinates
loading, draft filters, explicit application, latest-request guards and history-owned grid scroll.
Errors are selected by the scenario. There is no new global source of applied conditions.

The old `modules/catalog` entries are compatibility exports for the details screen until its
migration. The old VNDB card type names alias the independent entity types for the remaining legacy UI and details.
These compatibility exports are removed in task 11 after their remaining consumers migrate.
The tag directory and picker now share the Pinia owner described in refactoring-tags.md.
