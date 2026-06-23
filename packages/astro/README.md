# @contentbit/astro

Astro renderer for [Content Blocks](https://contentbit.dev): `.astro` components
for rendering validated documents, with per-block component overrides.

Load content with Astro's built-in `glob()` loader, then parse and validate
with `@contentbit/core`:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

export const collections = {
  articles: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './content' }),
  }),
}
```

```astro
---
import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { ContentBlocks } from '@contentbit/astro/components'
import { getEntry } from 'astro:content'

const entry = await getEntry('articles', 'example')
if (!entry?.body) throw new Error('Entry "example" not found.')

const registry = createBlockRegistry().use(genericBlocks())
const { document } = validateDocument(parseDocument(entry.body), registry)
---

<ContentBlocks document={document} />
```

For static pages this runs at build time, so throwing on diagnostics fails the
build. To validate every content file in CI with `file:line:col` diagnostics,
run the CLI: `contentbit validate "content/**/*.md"`.

Override any block with your own Astro component via
`components={{ callout: MyCallout }}`. Overrides receive the block's validated
props as component props, a reserved `node` prop with the full block node
(`node.data` holds the parsed content), and the block's nested content via
`<slot />`.

The default prose pipeline is marked (GFM) with raw HTML escaped — the same
safe-by-default stance as every other render target. Contentbit is only the
block/validation layer: pass your own `renderMarkdown` when your site already
has a Markdown pipeline, including Astro's async Sätteri renderer in Astro 7.

Docs: https://contentbit.dev/docs
