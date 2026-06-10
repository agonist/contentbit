# @contentbit/react

React renderer for [Content Blocks](https://contentbit.dev) documents, with headless accessible defaults for every generic block.

```tsx
import { ContentBlocks } from '@contentbit/react'

<ContentBlocks
  document={result.document}
  renderMarkdown={(md) => <Markdown source={md} />}
/>
```

Pass `components` to override any block. A styled Tailwind pack is available through the shadcn registry: `pnpm dlx shadcn@latest add @contentbit/generic-pack`.

Docs: [contentbit.dev/docs](https://contentbit.dev/docs)
