---
'@contentbit/core': patch
'contentbit': patch
---

Fix two gaps in document validation:

- Validate and enrich known blocks nested inside an unknown block, and check the links inside it, when unknown blocks are only warnings.
- Check URL protocols on every link, image, autolink and reference definition the way a CommonMark renderer reads them, so `[x](<javascript:…>)`, `[x]( javascript:…)` and `[r]: javascript:…` are caught, and link syntax inside code is no longer flagged. `CB_URL_PROTOCOL` now points at the link itself instead of the start of the Markdown run.
