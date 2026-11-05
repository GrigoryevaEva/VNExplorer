# VNDB Explorer

A personal visual novel catalog built with Vue, TypeScript, and Vite. The browser queries [VNDB Kana](https://api.vndb.org/kana) directly; deployment consists entirely of static files.

## Using the site

- Catalog starts with top-rated stories. Submit a title with Enter or Search; language and included/excluded tag changes take effect with Apply filters. Done only closes the tag picker. Strict match requires every included tag; disabling it accepts any included tag while preserving every exclusion.
- Russian/English availability includes published demos and partial releases. A match does not promise a complete translation. Open a story for spoiler-free tags, screenshots and all language-grouped releases, including planned editions. Expand a group to load its complete rows automatically.
- Save from cards or story pages. Saved has local title search, recently-added/rating/first-release sorting and an eight-second Undo after removal.
- Applied Catalog conditions and numbered pages live in the URL. Browser Back restores Catalog history and its results position.

## Development

Requires Node.js 24 and npm:

```sh
npm ci
npm run dev
```

The development server uses port 5173. For validation:

```sh
npm run lint
npm run lint:styles
npm run format:check
npm run typecheck
npm run test:unit
npm run test:automation
npx playwright install chromium
npm run test:e2e
npm run test:static
```

Static checks do not execute tests or modify files. Use `lint:fix`, `lint:styles:fix` and `format`
for explicit corrections; `test:unit:watch` runs Vitest interactively. The `@/` alias resolves to
`src/` in Vite, TypeScript and Vitest. Unit tests use Node by default; component tests opt into
jsdom. Playwright remains a separate browser suite.

`test:static` builds, then serves only generated files through a test SPA fallback. It checks `/` and a separately built `/novels/` base, direct detail/Saved links, refresh, assets and the full Catalog → detail/gallery/releases → Saved → Catalog flow. HTTP-edge fixtures make these checks deterministic.

`test:production` runs the same smoke against an existing `dist` (and builds its subpath fixture). `test:automation` checks release CLIs only in temporary Git repositories and checks live-process cleanup without VNDB. `typecheck` includes a separate strict `typecheck:scripts`; executing native TypeScript scripts alone does not typecheck them.

`npm run test:live` performs a small real-browser VNDB check; `npm run test:handoff-live` adds title-alias/page/count/detail evidence. All six live commands share a 24-request budget, a 120-second browser deadline and a 10-second startup deadline; tag probes use only two tiny pages. Live checks depend on VNDB availability and limits; they are not part of the repeatable suite. Screenshots from static checks are written to `test-results/static-handoff/` (override with `SMOKE_ARTIFACT_DIR`).

Use a separate `task/<name>` branch based on current `dev` for each task. Include a changeset with the change before merging back.

## Build and deploy

For a site at the domain root:

```sh
npm ci
npm run build
```

Copy **the contents of `dist/`**, including `assets/`, to the prepared static document root. Node/npm are build tools; no production Node service, backend, database or account setup is needed. `npm run preview` is a local build preview, not a deployment requirement.

Use HTML5 history fallback: a request for an application route such as `/vn/v17` or `/saved` must return `index.html` with status 200. Serve existing JavaScript, CSS, images and icons as files with their correct MIME types. Missing assets should return 404. For example, inside an existing Nginx server block serving the copied files:

```nginx
root /srv/www/vndb-explorer;
location /assets/ { try_files $uri =404; }
location / { try_files $uri $uri/ /index.html; }
```

For a subpath such as `https://example.org/novels/`, build for that exact base:

```sh
npm run build -- --base=/novels/
```

Copy the resulting `dist/` contents into `/srv/www/novels/` in this example. Configure the corresponding fallback (the base must have a trailing slash):

```nginx
root /srv/www;
location = /novels { return 308 /novels/; }
location /novels/assets/ { try_files $uri =404; }
location /novels/ { try_files $uri $uri/ /novels/index.html; }
```

Adapt the paths to the existing host. This repository does not provision or change your server. After deployment, directly open and refresh a detail URL and Saved, test browser Back, and confirm that real POST requests to `https://api.vndb.org/kana/` work from the deployed origin. Development-origin CORS success does not replace that check. If the host applies a Content Security Policy, it must permit that API connection and the source image URLs returned by VNDB. Keep source data/artwork attribution and follow [VNDB's data licence](https://vndb.org/d17).

## Browser storage and limitations

Saved is a versioned localStorage record containing VNDB IDs, addition times and last-known card details. It belongs to the browser and origin, persists through ordinary reloads, and is readable during API failures. Write failures are visible. It has no account, cross-device synchronization, reading statuses, personal ratings, notes, folders or export/import. Browser site-data removal, a different origin/profile or private-mode storage policies can remove or separate the collection.

Disposable API responses use a separate IndexedDB database: Catalog/search/count expire after five minutes, detail/release data after six hours, and tags after seven days. Fresh results and simultaneous identical requests are reused. During temporary API failures an available old response is explicitly marked as stale; otherwise the site shows an error and retry action. Saved card snapshots remain independent of this cache. Clearing only the response database does not remove Saved; clearing all site data does. There is no guarantee that images or a first visit work offline.

Requests remain subject to VNDB's availability, CORS and rate limits. Tag sections are curated by stable source IDs; All tags includes unassigned entries. Screenshot artwork is displayed without automatic sexual/violent blurring, and screenshots have no promised story-spoiler detection. There is no machine-translation Catalog toggle; release rows label source-reported demos, partial editions, patches and machine translation instead.

## Versioning

Run `npm run changeset` for every task. Preparing a version consumes pending notes into the version and CHANGELOG. Pushing a `vX.Y.Z` tag publishes a GitHub Release with a static-site ZIP. See [the changeset format and release commands](.changeset/README.md).
