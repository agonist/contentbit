# contentbit

## 0.7.2

### Patch Changes

- bb24aac: Make Astro initialization build-safe without editing or depending on the host
  project's content collections, and generate starter SEO content with no Doctor
  findings.
  - @contentbit/core@0.7.2
  - @contentbit/blocks@0.7.2

## 0.7.1

### Patch Changes

- 8c65c6d: Generate React renderer wrappers that assert compilation succeeded before
  passing a document to the validated renderer interface.
  - @contentbit/core@0.7.1
  - @contentbit/blocks@0.7.1

## 0.7.0

### Minor Changes

- 71b5fac: Deepen the project and rendering interfaces: add truthful processed/validated
  document types with strict compile helpers, infer block props and data in React
  renderers, discover shared settings from `contentbit.config.ts`, improve CLI
  help and option validation, and install Studio separately from the lightweight
  base CLI.
- 6c7ba9f: Add cross-document content-integrity findings, a read-only `contentbit adopt`
  workflow for existing Markdown libraries, and `contentbit doctor --watch` for
  local editing feedback.

### Patch Changes

- 6fb2631: Improve CLI daily-use ergonomics: no-glob commands can reuse package scripts, prop diagnostics point at the prop key, and `contentbit agents --check` reports integration status without writing files.
- 62747b5: Flag unknown block props with did-you-mean hints, improve agent install output, quote doctor footer globs, and report stale installed Claude Code skills.
- Updated dependencies [71b5fac]
- Updated dependencies [6fb2631]
- Updated dependencies [62747b5]
- Updated dependencies [6c7ba9f]
  - @contentbit/core@0.7.0
  - @contentbit/blocks@0.7.0

## 0.6.1

### Patch Changes

- Bundle internal project-loading utilities so published CLI and Studio packages do not depend on the private `@contentbit/project` workspace package.
- Updated dependencies
  - @contentbit/studio@0.6.1
  - @contentbit/core@0.6.1
  - @contentbit/blocks@0.6.1

## 0.6.0

### Minor Changes

- bbf5f77: Add SEO Brief + Doctor V1 with core SEO contracts, planned-page evaluation, `contentbit brief`, automatic doctor SEO findings, light Studio SEO visibility, shared project loading, and reusable core page-facts/link-graph read models.

### Patch Changes

- Updated dependencies [bbf5f77]
  - @contentbit/core@0.6.0
  - @contentbit/project@0.6.0
  - @contentbit/studio@0.6.0
  - @contentbit/blocks@0.6.0

## 0.5.0

### Minor Changes

- a1c099f: Add `scanContentProject()` to core — a single entry point that runs the per-file
  pipeline (frontmatter → parse → validate → analyze) plus the cross-file link
  graph and returns aggregated findings. The CLI's `validate`, `doctor`, `stats`,
  and `studio` build on it.

  Add `--no-generic-blocks` so a project registry can own generic block names
  without colliding with the built-in pack, and polish CLI output formatting.

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

- 05d5cbd: Internal: centralize CLI content-project loading behind a single
  `loadContentProject` seam. `validate`, `doctor`, and `stats` now share one
  glob → registry-load → read → scan path, and `stats` no longer runs its own
  separate validation pass. No user-facing behavior change.
- Updated dependencies [a1c099f]
- Updated dependencies [a1c099f]
  - @contentbit/core@0.5.0
  - @contentbit/studio@0.5.0
  - @contentbit/blocks@0.5.0

## 0.4.2

### Patch Changes

- Updated dependencies [0bc308d]
  - @contentbit/studio@0.4.2
  - @contentbit/core@0.4.2
  - @contentbit/blocks@0.4.2
  - @contentbit/html@0.4.2

## 0.4.1

### Patch Changes

- 7bdd4b8: Guard publishing so package manifests are packed through pnpm and workspace dependencies are rewritten to publishable semver ranges.
- Updated dependencies [7bdd4b8]
- Updated dependencies [2890b84]
  - @contentbit/blocks@0.4.1
  - @contentbit/core@0.4.1
  - @contentbit/html@0.4.1
  - @contentbit/studio@0.4.1

## 0.4.0

### Minor Changes

- [#14](https://github.com/agonist/contentbit/pull/14) [`a0e8214`](https://github.com/agonist/contentbit/commit/a0e8214b0f3b77f6cc8b11065eeeea5f33a4b7e0) Thanks [@agonist](https://github.com/agonist)! - Add `contentbit doctor`, a read-only audit command that ranks block validation, internal-link diagnostics, thin sections, block-less long documents, and missing image alt text in one repair plan. Use `--json` for agents and CI.

- [#15](https://github.com/agonist/contentbit/pull/15) [`efa6ab2`](https://github.com/agonist/contentbit/commit/efa6ab288cc3ec88090777628247a45ff03701ba) Thanks [@agonist](https://github.com/agonist)! - Add `contentbit studio`, a read-only local TanStack Studio for browsing content health, previews, stats, diagnostics, links, backlinks, keywords, and block usage. `contentbit init` now creates a `studio` script for `pnpm studio`.

### Patch Changes

- Updated dependencies [[`efa6ab2`](https://github.com/agonist/contentbit/commit/efa6ab288cc3ec88090777628247a45ff03701ba)]:
  - @contentbit/studio@0.4.0
  - @contentbit/core@0.4.0
  - @contentbit/blocks@0.4.0
  - @contentbit/html@0.4.0

## 0.3.0

### Minor Changes

- [#5](https://github.com/agonist/contentbit/pull/5) [`3739eea`](https://github.com/agonist/contentbit/commit/3739eea3362c764f703a42bfb57773f827cc721e) Thanks [@agonist](https://github.com/agonist)! - Internal linking: a frontmatter-authored cross-link graph with a generated index, plus locale-aware resolution modes for multilingual content.

  - Author `slug`, `linksTo`, `aliases`, and `keywords` in frontmatter (the parser now reads one level of nested mappings, e.g. `keywords.primary`).
  - `contentbit links <globs>` builds `.contentbit/link-index.json` with derived `linkedFrom` backlinks and alias-resolved `linksTo`, and reports a summary.
  - Link checks run automatically during `contentbit validate` when any file declares a `slug`: dangling links (`CB_LINK_UNRESOLVED`, with a did-you-mean hint), duplicate slugs, alias conflicts, plus self-link and orphan warnings.
  - Configure matching with `--link-resolve`, `--locale-field`, `--slug-field`, `--key-field`, and `--default-locale` for global slug, same-locale slug, same-locale key, or same-locale-key-with-slug-fallback projects.
  - `contentbit links --fix` heals renamed-slug references by rewriting `linksTo` entries that point at a known alias to the current slug (the `aliases` record itself is left intact).
  - `contentbit agents` now teaches installed skills and `AGENTS.md` blocks to use `contentbit links` and the generated index when writing or auditing linked content.
  - New core API: `parseLinkFrontmatter`, `buildLinkIndex`, `validateLinks`, `serializeLinkIndex`, `linkResolverFromOptions`, and `aliasReplacementsForPage`.
  - `@contentbit/astro` now declares Astro 7 peer support.

### Patch Changes

- Updated dependencies [[`3739eea`](https://github.com/agonist/contentbit/commit/3739eea3362c764f703a42bfb57773f827cc721e)]:
  - @contentbit/core@0.3.0
  - @contentbit/blocks@0.3.0
  - @contentbit/html@0.3.0

## 0.2.0

### Minor Changes

- [#3](https://github.com/agonist/contentbit/pull/3) [`233245b`](https://github.com/agonist/contentbit/commit/233245b08e07d488861c9345047cf75888710d40) Thanks [@agonist](https://github.com/agonist)! - Coding-agent integration. New `contentbit agents` command (also run by `init`,
  skip with `--no-agents`) installs Claude Code skills — `contentbit-author`
  (fetch the live authoring guide, write, validate until clean) and
  `contentbit-audit` (rank findings from `stats` JSON) — and manages a fenced
  instruction block in `AGENTS.md` for every other agent. Skills hold no schemas;
  they read everything from the CLI at runtime, so custom blocks are picked up
  automatically. `contentbit stats` now accepts multiple files and globs,
  emitting a JSON array (single files keep the flat object shape).

- [`3c57e88`](https://github.com/agonist/contentbit/commit/3c57e884ab41f7f1a668c06e248dffc48439f80b) Thanks [@agonist](https://github.com/agonist)! - First synchronized release — all packages now share the same version number.

  - New `@contentbit/astro` package: renderer-only Astro integration for contentbit documents.
  - New document stats: `analyzeDocument` in `@contentbit/core` and a `contentbit stats` command in the CLI.

### Patch Changes

- Updated dependencies [[`233245b`](https://github.com/agonist/contentbit/commit/233245b08e07d488861c9345047cf75888710d40), [`3c57e88`](https://github.com/agonist/contentbit/commit/3c57e884ab41f7f1a668c06e248dffc48439f80b)]:
  - @contentbit/core@0.2.0
  - @contentbit/blocks@0.2.0
  - @contentbit/html@0.2.0
