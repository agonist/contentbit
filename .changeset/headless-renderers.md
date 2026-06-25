---
'@contentbit/astro': minor
'@contentbit/react': minor
'@contentbit/core': minor
'@contentbit/blocks': minor
'@contentbit/studio': minor
'contentbit': minor
---

Make the React and Astro renderers headless. Renderers no longer ship built-in
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
