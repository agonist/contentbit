# @contentbit/react

Headless React renderer for [Content Blocks](https://contentbit.dev) documents.

```tsx
import { defineBlockComponent, defineBlockComponents, ContentBlocks } from '@contentbit/react'

const CalloutBlock = defineBlockComponent(calloutBlock, ({ node, ctx }) => (
  <aside>{ctx.renderMarkdown(node.data.markdown)}</aside>
))
const components = defineBlockComponents([calloutBlock], { callout: CalloutBlock })

<ContentBlocks
  document={result.document}
  components={components}
  renderMarkdown={(md) => <Markdown source={md} />}
/>
```

The helpers infer the block name, validated Zod props, and parsed content data,
and reject misspelled component-map keys.

`components` maps block names to React components. A styled Tailwind pack is
available through the shadcn registry, where files are copied into your app:
`pnpm dlx shadcn@latest add @contentbit/generic-pack`.

Docs: [contentbit.dev/docs](https://contentbit.dev/docs)
