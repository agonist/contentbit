# @contentbit/astro

## 0.5.0

### Minor Changes

- a1c099f: Make the React and Astro renderers headless. Renderers no longer ship built-in
  styled components; callers supply their own components and a host Markdown
  renderer, and unrendered blocks fall back to their raw body (Astro can annotate
  or throw via `onInvalid`).

  Breaking (Astro): `genericAstroRenderers`, `renderBlockShell`,
  `AstroBlockRenderContext`, `AstroBlockRenderer`, `BlockShell`, and
  `RenderBlockOptions` are removed. The renderer now exposes
  `AstroBlockContext` (the `ctx` passed to block components), plus
  `fallbackMarkdown`, `invalidBlockHtml`, and `unrenderableBlockError` for
  fallback handling.

  Core now re-exports `ValidatedDocumentNode` / `ValidatedBlockNode` for renderer
  typing. The generic block pack owns the Astro prose fallback, and validated
  documents are marked so renderers can type-guard them.

### Patch Changes

- Updated dependencies [a1c099f]
- Updated dependencies [a1c099f]
  - @contentbit/core@0.5.0

## 0.4.2

### Patch Changes

- @contentbit/core@0.4.2
- @contentbit/blocks@0.4.2
- @contentbit/html@0.4.2

## 0.4.1

### Patch Changes

- 7bdd4b8: Guard publishing so package manifests are packed through pnpm and workspace dependencies are rewritten to publishable semver ranges.
- Updated dependencies [7bdd4b8]
  - @contentbit/blocks@0.4.1
  - @contentbit/core@0.4.1
  - @contentbit/html@0.4.1

## 0.4.0

### Patch Changes

- [#9](https://github.com/agonist/contentbit/pull/9) [`beddf85`](https://github.com/agonist/contentbit/commit/beddf85b4cfbf2b66254969671ebe201bc86b36d) Thanks [@agonist](https://github.com/agonist)! - Allow the Astro renderer to await host Markdown renderers, so projects can delegate prose back to Astro/Sätteri while contentbit handles block validation and rendering.

- Updated dependencies []:
  - @contentbit/core@0.4.0
  - @contentbit/blocks@0.4.0
  - @contentbit/html@0.4.0

## 0.3.0

### Patch Changes

- [#5](https://github.com/agonist/contentbit/pull/5) [`3739eea`](https://github.com/agonist/contentbit/commit/3739eea3362c764f703a42bfb57773f827cc721e) Thanks [@agonist](https://github.com/agonist)! - Internal linking: a frontmatter-authored cross-link graph with a generated index, plus locale-aware resolution modes for multilingual content.

  - Author `slug`, `linksTo`, `aliases`, and `keywords` in frontmatter (the parser now reads one level of nested mappings, e.g. `keywords.primary`).
  - `contentbit links <globs>` builds `.contentbit/link-index.json` with derived `linkedFrom` backlinks and alias-resolved `linksTo`, and reports a summary.
  - Link checks run automatically during `contentbit validate` when any file declares a `slug`: dangling links (`CB_LINK_UNRESOLVED`, with a did-you-mean hint), duplicate slugs, alias conflicts, plus self-link and orphan warnings.
  - Configure matching with `--link-resolve`, `--locale-field`, `--slug-field`, `--key-field`, and `--default-locale` for global slug, same-locale slug, same-locale key, or same-locale-key-with-slug-fallback projects.
  - `contentbit links --fix` heals renamed-slug references by rewriting `linksTo` entries that point at a known alias to the current slug (the `aliases` record itself is left intact).
  - `contentbit agents` now teaches installed skills and `AGENTS.md` blocks to use `contentbit links` and the generated index when writing or auditing linked content.
  - New core API: `parseLinkFrontmatter`, `buildLinkIndex`, `validateLinks`, `serializeLinkIndex`, `linkResolverFromOptions`, and `aliasReplacementsForPage`.
  - `@contentbit/astro` now declares Astro 7 peer support.

- Updated dependencies [[`3739eea`](https://github.com/agonist/contentbit/commit/3739eea3362c764f703a42bfb57773f827cc721e)]:
  - @contentbit/core@0.3.0
  - @contentbit/blocks@0.3.0
  - @contentbit/html@0.3.0

## 0.2.0

### Minor Changes

- [`3c57e88`](https://github.com/agonist/contentbit/commit/3c57e884ab41f7f1a668c06e248dffc48439f80b) Thanks [@agonist](https://github.com/agonist)! - First synchronized release — all packages now share the same version number.

  - New `@contentbit/astro` package: renderer-only Astro integration for contentbit documents.
  - New document stats: `analyzeDocument` in `@contentbit/core` and a `contentbit stats` command in the CLI.

### Patch Changes

- Updated dependencies [[`233245b`](https://github.com/agonist/contentbit/commit/233245b08e07d488861c9345047cf75888710d40), [`3c57e88`](https://github.com/agonist/contentbit/commit/3c57e884ab41f7f1a668c06e248dffc48439f80b)]:
  - @contentbit/core@0.2.0
  - @contentbit/blocks@0.2.0
  - @contentbit/html@0.2.0
