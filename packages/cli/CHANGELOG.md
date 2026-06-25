# contentbit

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
