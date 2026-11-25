# @contentbit/core

## 1.0.0-rc.1

### Patch Changes

- aca73ce: Read files with CRLF line endings or a leading UTF-8 byte order mark the same
  as plain LF files. List and rows blocks no longer fail with `CB_ITEM_SYNTAX` or
  `CB_ROW_SYNTAX` in Windows checkouts, and a byte order mark no longer hides the
  frontmatter. Diagnostics keep the line and column an editor shows. Offsets
  count characters of the text after line endings become LF.

  Frontmatter parsing now follows YAML in three more cases. A dash list may sit at
  its key's own indentation, as PyYAML writes it. A list item such as
  `https://example.com/x` stays a string. A `#` after whitespace starts a comment,
  so `title: "Foo" # draft` reads as `Foo`. Quote a value that must keep a ` #`.

- 512e1d2: Fix false findings and lost pages in parsing, integrity, and SEO checks:

  - A line that starts with inline code such as "`js` here" no longer opens a
    code fence, and a fence line with an info string no longer closes one.
  - Heading anchors match the ids renderers emit (github-slugger), so accented
    anchors and headings with inline code resolve. Heading outline text keeps
    inline code.
  - Links to the site root are no longer reported as unresolved routes.
  - Configured `slugField`, `keyField`, and `localeField` win over the canonical
    names in page facts, and integrity checks such as the missing H1 read page
    identity through page facts.
  - SEO `requiredFrontmatter` treats empty strings and `null` as missing.
  - SEO pages that share an id are both kept, with a `CB_SEO_PAGE_ID_DUPLICATE`
    warning, and localized files with a planned page's key replace that plan.

- 09c7364: Build the link index in linear time, and only once per content project scan.
  Indexing and validating 4000 pages took seconds and now takes milliseconds,
  including pages linked from every other page and projects with many orphan
  warnings.

  Stop a malformed frontmatter field from dropping a page out of the link index
  and reporting every link to it as unresolved. Links now read `title` and
  `keywords` the way page facts do, so a `keywords` array no longer reports
  `CB_LINK_SHAPE`. A malformed `linksTo` or `aliases` is still reported, but
  the page stays a link target. `parseLinkFrontmatter` returns that page in
  `value` alongside its `errors`.

- 20e31ca: `contentbit links --fix` now rewrites only whole `linksTo` entries that resolve
  through an alias. It no longer replaces an alias inside a longer slug (`guide`
  in `setup-guide`), and it no longer retargets an entry that resolves to another
  page's key. It now fixes files with CRLF line endings and keeps those endings,
  and the link index it writes describes the fixed files. `aliasReplacementsForPage`
  returns only the aliases the page's `linksTo` resolves through.
- 0872923: Fix two gaps in document validation:

  - Validate and enrich known blocks nested inside an unknown block, and check the links inside it, when unknown blocks are only warnings.
  - Check URL protocols on every link, image, autolink and reference definition the way a CommonMark renderer reads them, so `[x](<javascript:…>)`, `[x]( javascript:…)` and `[r]: javascript:…` are caught, and link syntax inside code is no longer flagged. `CB_URL_PROTOCOL` now points at the link itself instead of the start of the Markdown run.

## 1.0.0-rc.0

### Major Changes

- Prepare the v1 release candidate with the documented public compatibility contract.
  Initialize projects with Contentbit packages matching the running CLI, including
  prereleases, and pin Studio's TanStack dependencies to the tested versions.

  Upgrade all Contentbit packages together. See the v1 release candidate guide for
  installation, changes from 0.7.2, known limitations, and promotion criteria.

### Patch Changes

- 3bf64e8: Add provenance-aware page and project discovery for unconfigured Markdown
  libraries, including portable identities and conservative family/locale
  grouping in the read-only adoption report, plus a JSON-safe project snapshot
  interface for remote adapters.
- 349774a: Avoid guessing content families and locales from absolute machine paths or paths
  outside the project root. Preserve authored facts and keep sibling-content
  snapshot facts stable when a checkout moves.
- a6bd933: Fix v1 edge cases in validation and first-run workflows:

  - Reject invalid props in wrapped strict schemas instead of marking the document valid.
  - Resolve encoded Markdown links and avoid false broken-link warnings for relative assets.
  - Generate working Next.js example imports with either app directory layout.
  - Allow briefs before the first content file exists and honor explicit SEO config overrides.
  - Load separately installed Studio from the consuming project when using a global or npx CLI.
  - Resolve project path aliases when previewing copied styled components in Studio.
  - Keep snapshot paths and path-derived identities portable for content outside the project root.

## 0.7.2

## 0.7.1

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

## 0.6.1

## 0.6.0

### Minor Changes

- bbf5f77: Add SEO Brief + Doctor V1 with core SEO contracts, planned-page evaluation, `contentbit brief`, automatic doctor SEO findings, light Studio SEO visibility, shared project loading, and reusable core page-facts/link-graph read models.

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

## 0.4.2

## 0.4.1

### Patch Changes

- 7bdd4b8: Guard publishing so package manifests are packed through pnpm and workspace dependencies are rewritten to publishable semver ranges.

## 0.4.0

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

## 0.2.0

### Minor Changes

- [#3](https://github.com/agonist/contentbit/pull/3) [`233245b`](https://github.com/agonist/contentbit/commit/233245b08e07d488861c9345047cf75888710d40) Thanks [@agonist](https://github.com/agonist)! - Authoring guides now document every prop from the block's schema: name, type
  (with enum values spelled out), required/optional, default value, and the
  `.describe()` text. Previously props were only visible through examples, so an
  agent obeying "never guess props" could not discover optional props the example
  didn't use.

- [`3c57e88`](https://github.com/agonist/contentbit/commit/3c57e884ab41f7f1a668c06e248dffc48439f80b) Thanks [@agonist](https://github.com/agonist)! - First synchronized release — all packages now share the same version number.

  - New `@contentbit/astro` package: renderer-only Astro integration for contentbit documents.
  - New document stats: `analyzeDocument` in `@contentbit/core` and a `contentbit stats` command in the CLI.
