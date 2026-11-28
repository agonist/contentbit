---
'contentbit': minor
---

`contentbit check` now compares built pages with each other and with the sitemap. It warns when a page's hreflang alternate points to a page that lists no alternate back, or to no built page, and when a page lists two or more alternates without an `x-default`. When the build has a sitemap and the site's origin is known, it reports a sitemap URL that matches no built page or sits on another origin as an error, and warns about a sitemap URL for a page marked noindex and about an indexable page the sitemap leaves out. A page whose canonical URL points to another page is not expected in the sitemap.
