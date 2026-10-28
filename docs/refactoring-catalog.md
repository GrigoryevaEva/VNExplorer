# Catalog migration

`entities/catalog` owns independent conditions, variants, defaults and reset rules. The applied
conditions remain in the URL; `pages/catalog/route` converts them without importing a screen.
`api/catalog` compiles VNDB predicates and requests exact title-match counts. Its card schema
validates rows before successful caching; the mapper produces the independent visual novel model.

`pages/catalog` composes the screen with a local pagination component. `useCatalog` coordinates
loading, draft filters, explicit application, latest-request guards and history-owned grid scroll.
Errors are selected by the scenario. There is no new global source of applied conditions.

The old `modules/catalog` entries were removed after Details migrated to the entity conditions and page-owned URL codec. The last legacy card type consumer now imports the entity contract directly; unused old type aliases were removed as well.
The tag directory and picker now share the Pinia owner described in refactoring-tags.md.
