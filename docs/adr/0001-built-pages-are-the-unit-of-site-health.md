# Built pages are the unit of site health

Status: accepted (2026-11-28)

Contentbit checks a site's health on its built pages: the HTML each URL serves,
read from a static build folder or fetched from a running server. Markdown
source documents attach to built pages through page routes when they exist, and
add source locations, content contracts, and briefs, but a site needs no
Markdown to be checked. Source-only checks have to guess what the template and
router produce: on fond-site, they reported 542 missing h1 headings that the
layout renders and missed 253 broken table-of-contents anchors that only the
rendered HTML shows.

## Considered Options

- **Markdown only.** Contentbit's starting point. Rejected: it cannot see the
  title, canonical, hreflang, structured data, or anchors a site really
  serves, and it excludes sites whose content lives in a CMS, such as EmDash.
- **A headless browser crawler.** Rejected: heavy to install and slow in CI.
  Contentbit reads the HTML as the server sends it, as Google's first pass
  does, and reports pages whose content renders only in the browser.
- **A Rust reader now.** Deferred. Measured on fond-site, the time goes to
  one Markdown dependency, and a JavaScript HTML parser reads its 594 built
  pages in under half a second. Readers sit behind a file-in, facts-out
  interface so a faster one can replace them; checks stay in TypeScript so
  contributors can write rules.
