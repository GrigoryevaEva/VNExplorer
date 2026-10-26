# Development and releases

## Branches and notes

`dev` is the integration branch. Each task starts from current `dev` in a separate `task/<name>` branch, adds its own changeset, and merges back after checks pass. Merge current `dev` into the task branch before final validation. `main` is not updated automatically.

Run `npm run changeset`, select `visual-novels` (despite the private package), choose patch/minor/major, and describe the user-visible result. Commit the generated note with the task. Check it with `npm run changeset:check -- origin/dev`. CI checks newly added notes, not older pending changesets.

## Prepare a version

Start a release branch such as `task/release-0-1-0` from current `dev`:

```sh
npm ci
npm run version:release
npm run build
npm run test:e2e
```

Changesets consumes pending notes into the version and CHANGELOG; the script also refreshes the lockfile. Review and commit the result, then merge into `dev`. Version-preparation branches use the version/changelog changes instead of a new changeset describing consumption of old notes. The first compatible feature release is `0.1.0`; pending notes are not released features.

## Publish

From a clean, tested version commit:

```sh
npm run release:tag
git push origin dev
git push origin v0.1.0
```

Use the actual generated tag. A `vX.Y.Z` tag triggers the Release workflow, which checks the matching version, installs locked dependencies, runs available browser tests, builds, and creates a GitHub Release with CHANGELOG notes and a ZIP of the static site. No npm publication or server deployment occurs.

GitHub Actions must be enabled. The job uses its scoped `GITHUB_TOKEN` with contents write permission; no personal token is stored. The archive uses the configured Vite base. Rebuild for a different subdirectory base before deploying there.

## Local material

Agent instructions, specs/tasks, glossary, internal design docs, worktrees and test artifacts are ignored. README, release documentation, changesets, CHANGELOG, source, tests and workflows remain tracked. Do not ignore all Markdown files.
