# Changesets

Every task branch merged into `dev` adds its own Markdown changeset. These are public release notes, not agent logs. Run `npm run changeset`, select `visual-novels`, a version level, and a concise user-facing summary, or add a uniquely named Markdown file:

```md
---
'visual-novels': minor
---

Add submitted title search with shareable catalog links.
```

Use patch for fixes/maintenance, minor for compatible features, major for breaking changes. Mention any site-owner action required. Do not include local paths or secrets. Commit the note with the change; older pending notes do not satisfy a new task branch.

With release preparation approved, run `npm run version:release` to consume pending notes and update the package, lockfile and CHANGELOG. Before the first publication, verify that the prepared version is exactly `1.0.0`. When publication is approved, `npm run release:tag` validates the current version against CHANGELOG and creates the local tag. Pushing that tag starts the GitHub Release workflow and builds the static ZIP.
