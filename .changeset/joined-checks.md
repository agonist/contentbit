---
'contentbit': minor
'@contentbit/core': minor
---

`contentbit check` now checks Markdown source documents against the built pages that `links.routes` gives them. It warns with `CB_PAGE_TITLE_MISMATCH` or `CB_PAGE_DESCRIPTION_MISMATCH` when an indexable page's title or meta description does not contain the frontmatter `title` or `description`, and points at the frontmatter line. The comparison ignores case and extra whitespace and accepts either value containing the other, so a template suffix such as ` | Site` or a shortened description still matches. `CB_SITE_SOURCE_NOT_BUILT` is an error on a document whose route has no built page, redirect or host route.

Drafts and documents dated after today get neither finding. `site.draftField`, default `draft`, names the frontmatter field whose truthy value makes a document a draft, and `site.dateField`, default `date`, names its publication date.

When a Markdown file changed after the build, `check` prints a notice with the number of such files and asks you to rebuild, and `--json` lists them in `staleSources`. Their `CB_SITE_SOURCE_NOT_BUILT` and mismatch findings are warnings, since a rebuild may clear them.

`@contentbit/core` adds `draftField` and `dateField` to `ContentbitSiteConfig`.
