---
'contentbit': minor
'@contentbit/core': minor
---

`contentbit check` now says where to fix each built-page finding. When `links.routes` gives a built page a Markdown source document, a finding that the document writes points at its line: the line of a broken link's href, a canonical URL or a duplicated title, or line 1 for a title or description that the frontmatter lacks too. A problem that the same element causes on two or more pages, such as a broken table of contents link in the layout, becomes one template finding. The report prints it on one line with the element, the number of pages and three examples, and it counts as one finding. `--json` keeps every page and target in its `occurrences`.

Each finding in `--json` now has a `target`, the href, image src, URL or value it is about, and an `element`, such as `nav a.content-toc-link` or `title`. Link findings are one per page, href and element, and image findings one per page, src and element. `pages[].source` names the source document of a built page that has one.

`@contentbit/core` exports `contentPageUrlResolver`, the lookup from a content file to its public URL that `links.routes` describes.
