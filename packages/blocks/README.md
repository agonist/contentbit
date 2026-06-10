# @contentbit/blocks

The generic block pack for [Content Blocks](https://contentbit.dev): `callout`, `steps`, `key-metrics`, `quick-ref`, `comparison`, `pros-cons`, `tabs`, and `faq`.

```ts
import { createBlockRegistry } from '@contentbit/core'
import { genericBlocks } from '@contentbit/blocks'

const registry = createBlockRegistry().use(genericBlocks())
```

Each block ships its schema, content model, authoring guidance, and a plain-Markdown fallback renderer.

Reference: [contentbit.dev/blocks](https://contentbit.dev/blocks)
