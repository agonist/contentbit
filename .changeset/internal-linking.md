---
'@contentbit/core': minor
'contentbit': minor
'@contentbit/astro': patch
---

Internal linking: a frontmatter-authored cross-link graph with a generated index, plus locale-aware resolution modes for multilingual content.

- Author `slug`, `linksTo`, `aliases`, and `keywords` in frontmatter (the parser now reads one level of nested mappings, e.g. `keywords.primary`).
- `contentbit links <globs>` builds `.contentbit/link-index.json` with derived `linkedFrom` backlinks and alias-resolved `linksTo`, and reports a summary.
- Link checks run automatically during `contentbit validate` when any file declares a `slug`: dangling links (`CB_LINK_UNRESOLVED`, with a did-you-mean hint), duplicate slugs, alias conflicts, plus self-link and orphan warnings.
- Configure matching with `--link-resolve`, `--locale-field`, `--slug-field`, `--key-field`, and `--default-locale` for global slug, same-locale slug, same-locale key, or same-locale-key-with-slug-fallback projects.
- `contentbit links --fix` heals renamed-slug references by rewriting `linksTo` entries that point at a known alias to the current slug (the `aliases` record itself is left intact).
- `contentbit agents` now teaches installed skills and `AGENTS.md` blocks to use `contentbit links` and the generated index when writing or auditing linked content.
- New core API: `parseLinkFrontmatter`, `buildLinkIndex`, `validateLinks`, `serializeLinkIndex`, `linkResolverFromOptions`, and `aliasReplacementsForPage`.
- `@contentbit/astro` now declares Astro 7 peer support.
