# Astro renderer (`@contentbit/astro`) — design

**Date:** 2026-06-11
**Status:** Approved

## Goal

Ship a full Astro integration for contentbit: `.astro` components for
rendering validated documents plus an Astro 5 Content Layer loader that
validates Markdown at build time with `file:line:col` diagnostics. Wire it
into `contentbit init` so Astro projects get the same one-command setup as
Next/TanStack.

Motivation: the maintainer's main project runs Astro, so this doubles as a
real-world test bed.

## Package layout

New workspace package `packages/astro`, mirroring the sibling renderer
packages (tsc build via `tsconfig.build.json`, vitest, MIT, same
package.json metadata conventions):

```
packages/astro/
  package.json
  tsconfig.json / tsconfig.build.json
  src/
    index.ts                 # exports contentBlocks loader + public types
    loader.ts                # Content Layer loader implementation
    loader.test.ts
    components.test.ts
  components/
    ContentBlocks.astro      # entry component
    RenderNodes.astro        # recursive node walker
```

Exports map:

- `.` → `dist/index.js` (+ `.d.ts`) — loader and types.
- `./components` → `components/ContentBlocks.astro` shipped as raw source
  (the standard for Astro component libraries; Astro compiles `.astro` in
  the consumer's build).

Dependencies: `@contentbit/core`, `@contentbit/blocks`, `@contentbit/html`
(workspace), `marked` (prose Markdown default). Peer: `astro ^5`.
`files`: `dist`, `components`.

## Components

Usage:

```astro
---
import { ContentBlocks } from '@contentbit/astro/components'
import MyCallout from '../components/MyCallout.astro'
const entry = await getEntry('articles', 'example')
---
<ContentBlocks doc={entry.data.doc} components={{ callout: MyCallout }} />
```

Design decisions:

- **Defaults delegate to `@contentbit/html`.** For any block without an
  override, `RenderNodes.astro` calls the block's `genericHtmlRenderers`
  entry and injects the string via `set:html`. This guarantees parity with
  the HTML renderer (same markup, same `cb-` class names), avoids
  duplicating block markup in `.astro` files, and ships zero JS.
- **Overrides are real Astro components.** `components` maps block name →
  component. An override is rendered as `<Override {...node.props}
  node={node}>` with nested content passed as `<Fragment set:html={children}>`,
  so the override consumes nesting through its default `<slot />`. Because
  these are ordinary Astro components, users can also wrap framework
  components (React islands etc.).
- **Recursion.** `RenderNodes.astro` walks `ContentNode[]`: markdown nodes
  go through the prose pipeline; block nodes go through override-or-default.
  Nested blocks inside a block's content model recurse through the same
  walker.
- **Props passed through:** `doc`, `components?`, `classPrefix?` (default
  `cb-`), `renderMarkdown?`, `onInvalid?` (default `annotated` — see Error
  handling).

## Prose Markdown

Default prose pipeline is `marked` with GFM, wrapped so output is
deterministic and synchronous. Overridable via the `renderMarkdown` prop
(same escape hatch as `RenderToHtmlOptions.renderMarkdown`). Using
`@astrojs/markdown-remark` for shiki-identical output was considered and
rejected for v1: it is async and bound to the Astro config; users who want
it can plug it in through `renderMarkdown`.

## Loader (Astro 5 Content Layer)

```ts
// content.config.ts
import { defineCollection } from 'astro:content'
import { contentBlocks } from '@contentbit/astro'
import { blocks } from './src/content-blocks/blocks'

const articles = defineCollection({
  loader: contentBlocks({ pattern: 'src/content/articles/**/*.md', blocks }),
})
export const collections = { articles }
```

Behavior:

- Globs `pattern` relative to the project root, parses frontmatter +
  body, runs `@contentbit/core` parse + validate against the registry
  built from `blocks` (or an explicit `registry` option).
- Stores per entry: `{ doc: DocumentNode, ...frontmatter }` via
  `parseData`/`store.set`, with `digest` for incremental updates.
- In dev, registers with the loader context `watcher` to re-parse and
  re-validate changed files.

## Error handling

**Strict build, soft dev.** Dev mode is detected by the presence of
`watcher` on the loader context (only provided by `astro dev`).

- **Build:** any validation diagnostic throws an error containing the full
  formatted `file:line:col` diagnostic list. The build fails — this is the
  protocol's core promise.
- **Dev:** diagnostics are logged to the terminal via the loader's
  `logger`; the entry still loads with invalid blocks left unvalidated.
  `ContentBlocks` renders those as visible annotated boxes (reusing the
  html package's `onInvalid: 'annotated'` rendering) so authors can fix
  content live without the server dying mid-edit.
- `ContentBlocks` accepts `onInvalid: 'strict' | 'annotated' | 'fallback'`
  for parity with `renderToHtml`, defaulting to `annotated`.

## CLI init

`contentbit init` learns Astro:

- `detectFramework` recognizes `astro` in dependencies.
- New `astro` value joins the `html`/`react` target prompt and the
  auto-detection (`astro` deps → suggest `astro` target).
- Scaffolds: the framework-free blocks definition file (unchanged shape),
  `content.config.ts` wired to `contentBlocks()`, a starter Markdown doc
  under `src/content/`, and `src/pages/example.astro` rendering it via
  `<ContentBlocks>`.
- If `content.config.ts` (or `src/content.config.ts`) already exists, do
  not overwrite: print the collection snippet for manual merge.
- Installs `@contentbit/core @contentbit/blocks @contentbit/astro`.

## Testing

- **Loader unit tests:** mocked `LoaderContext` (store, parseData, logger,
  generateDigest; watcher present vs absent) covering: valid file stored
  with doc + frontmatter, invalid file throws in build mode, invalid file
  logs + loads in dev mode, watcher re-sync updates the store.
- **Component tests:** Astro Container API
  (`experimental_AstroContainer.renderToString`) in vitest covering
  default rendering, per-block overrides (props + slot content), nested
  blocks, markdown prose, and annotated invalid blocks.
- **Parity test:** default `<ContentBlocks>` output matches `renderToHtml`
  output for the shared fixture document (mirrors
  `packages/html/src/parity.test.ts`).
- **CLI tests:** extend `run.test.ts`/init tests for Astro detection and
  scaffold output.
- **Real-world smoke test:** consume the workspace package from the
  maintainer's Astro project.

## Out of scope (v1)

- `@astrojs/markdown-remark`-based prose pipeline (pluggable later via
  `renderMarkdown`).
- MDX or `.mdoc` support; loader handles plain `.md` only.
- An Astro "integration" (`astro add`-style) wrapper; the loader +
  components need no config hooks.
