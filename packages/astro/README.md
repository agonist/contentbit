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
import MyCallout from '../components/MyCallout.astro'

const entry = await getEntry('articles', 'example')
if (!entry?.body) throw new Error('Entry "example" not found.')

const registry = createBlockRegistry().use(genericBlocks())
const { document } = validateDocument(parseDocument(entry.body), registry)
---

<ContentBlocks document={document} components={{ callout: MyCallout }} />
```

For static pages this runs at build time, so throwing on diagnostics fails the
build. To validate every content file in CI with `file:line:col` diagnostics,
run the CLI: `contentbit validate "content/**/*.md"`.

Render blocks with your own Astro components via
`components={{ callout: MyCallout }}`. Components receive the block's validated
props as component props, reserved `node` and `ctx` props, and the block's
nested content via `<slot />`. `node.data` holds the parsed content; use
`ctx.renderMarkdown(...)` for any Markdown strings inside that data so your
component stays on the host app's prose pipeline.

The default prose pipeline is only a tiny escaped-paragraph fallback. Contentbit
does not bring a Markdown engine into your Astro app: pass your own
`renderMarkdown` when your site already has a Markdown pipeline, including
Astro's async Sätteri renderer in Astro 7.

Pre-made block UI is distributed through the shadcn registry, where files are
copied into your app as editable `.astro` source:
`pnpm dlx shadcn@latest add @contentbit/astro-pack`.

Docs: https://contentbit.dev/docs
