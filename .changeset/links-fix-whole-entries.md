---
'@contentbit/core': patch
'contentbit': patch
---

`contentbit links --fix` now rewrites only whole `linksTo` entries that resolve
through an alias. It no longer replaces an alias inside a longer slug (`guide`
in `setup-guide`), and it no longer retargets an entry that resolves to another
page's key. It now fixes files with CRLF line endings and keeps those endings,
and the link index it writes describes the fixed files. `aliasReplacementsForPage`
returns only the aliases the page's `linksTo` resolves through.
