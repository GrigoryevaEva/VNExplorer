# VNDB Explorer

A personal visual novel catalog built with Vue, TypeScript, and Vite. Development is in progress on `dev`; the application is not complete yet.

## Development

Requires Node.js 24 and npm. Run `npm ci`, `npm run dev`, and `npm run build`.

Use a separate `task/<name>` branch based on current `dev` for each task. Include a changeset with the change before merging back.

## Versioning

Run `npm run changeset` for every task. Preparing a version consumes pending notes into the version and CHANGELOG. Pushing a `vX.Y.Z` tag publishes a GitHub Release with a static-site ZIP. See [release instructions](docs/releasing.md) and [the changeset format](.changeset/README.md).

The final README will describe usage, deployment, and limitations once those features exist.
