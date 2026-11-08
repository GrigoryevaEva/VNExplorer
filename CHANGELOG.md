# Changelog

## 1.0.0

The first stable release of VNDB Explorer lets you discover visual novels and save candidates for later reading.

### Browse the catalog

- Start with top-rated visual novels, search by title, and sort by rating or first release date. Results show an exact count and numbered pages.
- Browse the complete tag directory by section or name. Include and exclude multiple tags, and use Strict match to require every included tag.
- Filter for Russian or English availability, including published demos and partial translations. When filters hide title matches, the catalog shows how many matches you can see by clearing them.
- Share a link to the applied search, filters, sort order, and page. Browser Back restores the catalog and your position in the results.

### Explore visual novel details

- See source titles, cover art, ratings, votes, first release date, estimated play time, and formatted descriptions. Open a fresh catalog search from a spoiler-free tag.
- Browse full screenshots on desktop or mobile. The viewer supports keyboard navigation and restores focus and scroll position when closed.
- Expand a language group to load all its editions, including planned releases. Rows show source details such as demos, patches, partial or machine translations, and link to release websites when available.

### Keep a Saved collection

- Save visual novels from a card or detail page, search and sort the collection, and undo a removal. Saved lives in your browser and remains readable from its last-known snapshots during VNDB outages.
- Recent VNDB responses are cached separately from Saved. The app marks older results when it falls back to them during a temporary outage and offers retry when no result is available.

### Deploy the static site

- The release ZIP contains the site files for deployment at the domain root. Configure the host to serve `index.html` for application routes. For a subpath, build with the matching Vite base as described in the repository README.
