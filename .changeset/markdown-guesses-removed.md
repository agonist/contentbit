---
'@contentbit/core': major
---

The Markdown checks no longer report `CB_H1_MISSING`, `CB_INTERNAL_URL_UNRESOLVED` or `CB_MARKDOWN_ANCHOR_UNRESOLVED`. They guessed at what the template renders and where the router sends a URL. `contentbit check` reports these problems from the built pages as `CB_PAGE_H1_MISSING`, `CB_LINK_PAGE_MISSING` and `CB_LINK_ANCHOR_MISSING`, so a Markdown-only run, with no build, no longer checks internal URLs or `#anchor` links. `CB_MARKDOWN_LINK_UNRESOLVED` still reports a relative `.md` or `.mdx` link to a file that does not exist. `links.routes` and `links.hostRoutes` keep their meaning: they tie Markdown documents to their built pages.
