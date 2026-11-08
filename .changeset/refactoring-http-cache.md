---
'visual-novels': patch
---

Centralize VNDB requests in Axios with validated responses and typed failures while preserving browser caching, shared requests and independent cancellation. Invalid responses remain retriable errors instead of empty or stale successes.
