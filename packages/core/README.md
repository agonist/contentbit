# @contentbit/core

Parser, validator, and registry for [Content Blocks](https://contentbit.dev): structured Markdown components without framework lock-in.

```ts
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { genericBlocks } from '@contentbit/blocks'

const registry = createBlockRegistry().use(genericBlocks())
const result = validateDocument(parseDocument(markdown), registry)
```

Documents are plain Markdown with directive blocks. Validation runs before rendering and produces `file:line:col` diagnostics a human or an LLM can act on. The same registry generates LLM authoring instructions via `toAuthoringGuide()`.

Docs: [contentbit.dev/docs](https://contentbit.dev/docs)
