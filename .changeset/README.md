# Changesets

Each change merged into `dev` adds its own Markdown changeset. These are public release notes. Run `npm run changeset`, select `visual-novels` and a version level, and enter a concise user-facing summary. You can also add a uniquely named Markdown file.

```md
---
'visual-novels': minor
---

Add submitted title search with shareable catalog links.
```

Use patch for fixes and maintenance, minor for compatible features, and major for breaking changes. Mention any action a site owner needs to take. Leave out local paths and secrets. Commit the note with the change. The Changeset check requires a new note for the branch or a version bump and a changelog update.

## Prepare a release

Start with a clean worktree on a branch from current `dev`. For the first release, use `task/release-1-0-0` and confirm the prepared version is exactly `1.0.0`.

Run `npm ci` on Node.js 24, then `npm run version:release`. This consumes pending notes into `CHANGELOG.md` and updates `package.json` and `package-lock.json`. Review the result, run the approved checks, commit the version, and integrate it into `dev`.

## Publish a release

After publication is approved, run `npm run release:tag` on clean `dev`. It checks for an exact version heading in `CHANGELOG.md` and creates the local annotated tag. Push `dev`, then push the tag explicitly.

The Release workflow runs its checks and creates a GitHub Release with the matching changelog section and a static ZIP for the domain root. Follow the [deployment guide](../README.md#build-and-deploy) when copying the files to a host or building for a subpath.

## Branches and testing

Until `v1.0.0` is published, use `task/<name>` branches from `dev` and run checks throughout the work. Run the full regression and production smoke before the first publication.

After publication, start from current `dev`. Use `feature/<name>` for major features, `fix/<name>` for bugs, and `docs/<name>` for documentation-only changes. Write and run tests at the end of the branch after review approval and the maintainer's instruction to test. Account for CI when pushing branches or tags that trigger it.
