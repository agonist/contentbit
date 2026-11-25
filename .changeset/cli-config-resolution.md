---
'contentbit': patch
---

Fix CLI path resolution, project discovery, help, and version:

- Resolve relative `--registry` and `--seo-config` paths against the current directory, with or without explicit globs. Paths inside the config or a fallback package script still resolve against that file.
- Report a missing registry module as an input error (exit 2) that names the resolved path, instead of crashing.
- Stop config and package-script discovery at the nearest `package.json`, so a parent folder's config no longer overrides a nearer package's own content script.
- Exit 0 from `contentbit help` and `contentbit help <command>`, and add `--version` / `-V`.
