---
'contentbit': patch
---

Internal: centralize CLI content-project loading behind a single
`loadContentProject` seam. `validate`, `doctor`, and `stats` now share one
glob → registry-load → read → scan path, and `stats` no longer runs its own
separate validation pass. No user-facing behavior change.
