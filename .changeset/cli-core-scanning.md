---
'@contentbit/core': minor
'contentbit': minor
'@contentbit/studio': minor
---

Add `scanContentProject()` to core — a single entry point that runs the per-file
pipeline (frontmatter → parse → validate → analyze) plus the cross-file link
graph and returns aggregated findings. The CLI's `validate`, `doctor`, `stats`,
and `studio` build on it.

Add `--no-generic-blocks` so a project registry can own generic block names
without colliding with the built-in pack, and polish CLI output formatting.
