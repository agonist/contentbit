---
'@contentbit/core': patch
'contentbit': patch
'@contentbit/studio': patch
---

Avoid guessing content families and locales from absolute machine paths or paths
outside the project root. Preserve authored facts and keep sibling-content
snapshot facts stable when a checkout moves.
