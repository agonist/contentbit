# @contentbit/studio

## 0.4.2

### Patch Changes

- 0bc308d: Resolve Studio's internal source alias explicitly so the published dashboard can load its routes from installed packages.
  - @contentbit/core@0.4.2
  - @contentbit/blocks@0.4.2
  - @contentbit/html@0.4.2
  - @contentbit/react@0.4.2

## 0.4.1

### Patch Changes

- 7bdd4b8: Guard publishing so package manifests are packed through pnpm and workspace dependencies are rewritten to publishable semver ranges.
- 2890b84: Allow Studio to serve dependency assets hoisted to its workspace root, so monorepo sites can load packaged fonts and other Vite-served files while running the local dashboard. The served file scope is bounded to the Studio package, its workspace root, and the consuming project's working directory.
- Updated dependencies [7bdd4b8]
  - @contentbit/blocks@0.4.1
  - @contentbit/core@0.4.1
  - @contentbit/html@0.4.1
  - @contentbit/react@0.4.1

## 0.4.0

### Minor Changes

- [#15](https://github.com/agonist/contentbit/pull/15) [`efa6ab2`](https://github.com/agonist/contentbit/commit/efa6ab288cc3ec88090777628247a45ff03701ba) Thanks [@agonist](https://github.com/agonist)! - Add `contentbit studio`, a read-only local TanStack Studio for browsing content health, previews, stats, diagnostics, links, backlinks, keywords, and block usage. `contentbit init` now creates a `studio` script for `pnpm studio`.

### Patch Changes

- Updated dependencies []:
  - @contentbit/core@0.4.0
  - @contentbit/blocks@0.4.0
  - @contentbit/html@0.4.0
  - @contentbit/react@0.4.0
