---
'contentbit': minor
---

`contentbit check` now checks the built pages it reads. It reports a page whose content renders only in the browser; a missing title, meta description, canonical URL or h1; more than one h1; a canonical URL that points to another page or another origin; a title or description that several pages share; images without an alt attribute; and JSON-LD that does not parse. It checks every internal link and reports links to missing pages, ids and files, and links from an indexable page to a noindex page. A link passes when it reaches a built page, a file in the build, a `_redirects` rule or a path in `links.hostRoutes`. Errors, such as a broken link, make `check` exit 1.

The report groups these findings by code, with up to five examples each; `--json` lists them all. With a build folder, `check` no longer reports the Markdown findings `CB_H1_MISSING`, `CB_INTERNAL_URL_UNRESOLVED` and `CB_MARKDOWN_ANCHOR_UNRESOLVED`, which guessed at what the built pages show.
