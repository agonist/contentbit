---
'@contentbit/core': minor
'contentbit': minor
---

Check internal URLs against the routes a site really serves. `links.routes` in
`contentbit.config.ts` maps each content directory to a URL pattern such as
`/docs/{path}` or `/blog/{slug}`, and `links.hostRoutes` lists pages the host
app serves outside content, such as `/playground`. With routes set, Doctor,
Studio, and snapshots flag an internal URL only when no page or host route has
it, check its `#anchor` against that page, and no longer accept a link because
its last segment matches some page's slug. Sites that route pages by file path
no longer get a `CB_INTERNAL_URL_UNRESOLVED` warning on every working link.
