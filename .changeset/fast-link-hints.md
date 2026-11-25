---
'@contentbit/core': patch
'contentbit': patch
---

Find did-you-mean hints for unresolved links about a hundred times faster.
With a broken `linksTo` on every one of 4000 pages, link validation took
nearly three minutes and now takes under two seconds. A target that many pages
link to is looked up once. Hints are unchanged: each names the same page as
before, and unknown block and prop hints use the same search.
