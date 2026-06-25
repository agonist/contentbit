# @contentbit/react

Headless React renderer for [Content Blocks](https://contentbit.dev) documents.

```tsx
import { ContentBlocks } from '@contentbit/react'

<ContentBlocks
  document={result.document}
  components={{ callout: CalloutBlock }}
  renderMarkdown={(md) => <Markdown source={md} />}
/>
```

`components` maps block names to React components. A styled Tailwind pack is
available through the shadcn registry, where files are copied into your app:
`pnpm dlx shadcn@latest add @contentbit/generic-pack`.

Docs: [contentbit.dev/docs](https://contentbit.dev/docs)
