---
'@contentbit/core': patch
'contentbit': patch
---

Build the link index in linear time, and only once per content project scan.
Indexing and validating 4000 pages took seconds and now takes milliseconds,
including pages linked from every other page and projects with many orphan
warnings.

Stop a malformed frontmatter field from dropping a page out of the link index
and reporting every link to it as unresolved. Links now read `title` and
`keywords` the way page facts do, so a `keywords` array no longer reports
`CB_LINK_SHAPE`. A malformed `linksTo` or `aliases` is still reported, but
the page stays a link target. `parseLinkFrontmatter` returns that page in
`value` alongside its `errors`.
