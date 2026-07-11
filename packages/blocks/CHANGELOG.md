# @contentbit/blocks

## 0.7.0

### Minor Changes

- 71b5fac: Deepen the project and rendering interfaces: add truthful processed/validated
  document types with strict compile helpers, infer block props and data in React
  renderers, discover shared settings from `contentbit.config.ts`, improve CLI
  help and option validation, and install Studio separately from the lightweight
  base CLI.

### Patch Changes

- Updated dependencies [71b5fac]
- Updated dependencies [6fb2631]
- Updated dependencies [62747b5]
- Updated dependencies [6c7ba9f]
  - @contentbit/core@0.7.0

## 0.6.1

### Patch Changes

- @contentbit/core@0.6.1

## 0.6.0

### Patch Changes

- Updated dependencies [bbf5f77]
  - @contentbit/core@0.6.0

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

## 0.4.1

### Patch Changes

- 7bdd4b8: Guard publishing so package manifests are packed through pnpm and workspace dependencies are rewritten to publishable semver ranges.
- Updated dependencies [7bdd4b8]
  - @contentbit/core@0.4.1

## 0.4.0

### Patch Changes

- Updated dependencies []:
  - @contentbit/core@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [[`3739eea`](https://github.com/agonist/contentbit/commit/3739eea3362c764f703a42bfb57773f827cc721e)]:
  - @contentbit/core@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [[`233245b`](https://github.com/agonist/contentbit/commit/233245b08e07d488861c9345047cf75888710d40), [`3c57e88`](https://github.com/agonist/contentbit/commit/3c57e884ab41f7f1a668c06e248dffc48439f80b)]:
  - @contentbit/core@0.2.0
