# Changesets

Every task branch merged into `dev` adds its own Markdown changeset. These are public release notes, not agent logs. Run `npm run changeset`, select `visual-novels`, a version level, and a concise user-facing summary, or add a uniquely named Markdown file:

```md
---
'visual-novels': minor
---

Add submitted title search with shareable catalog links.
```

Use patch for fixes/maintenance, minor for compatible features, major for breaking changes. Mention any site-owner action required. Do not include local paths or secrets. Commit the note with the change; older pending notes do not satisfy a new task branch.

See [release instructions](../docs/releasing.md) for generating versions, changelog entries, tags, and static-site GitHub Releases.
