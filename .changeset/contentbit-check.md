---
'contentbit': minor
'@contentbit/core': minor
---

Add `contentbit check`. It reads a site's build folder: the folder you pass, `site.build` from the config, or the first of `dist/client`, `dist`, `out`, `build` and `public` that has an `index.html`. It reports the built pages and the site's origin, from `--origin`, `site.origin` or the pages' canonical URLs. When the config lists content, it also runs the Markdown checks that `doctor` runs. `--json` prints one `contentbit.site-check.v1` report, and `--strict` fails on warnings.

The Contentbit config no longer requires `content`. A new `site` section names the build folder, relative to the config file, and the site's public origin.
