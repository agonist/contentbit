# @contentbit/core

Parser, validator, and registry for [Content Blocks](https://contentbit.dev): structured Markdown components for LLM-written content.

```ts
import { assertValidDocument, compileDocument, createBlockRegistry } from '@contentbit/core'
import { genericBlocks } from '@contentbit/blocks'

const registry = createBlockRegistry().use(genericBlocks())
const document = assertValidDocument(compileDocument(markdown, registry), 'article.md')
```

Documents are plain Markdown with directive blocks. Validation runs before rendering and produces `file:line:col` diagnostics a coding agent can act on. The same registry generates LLM authoring instructions via `toAuthoringGuide()`.

Use the lower-level `parseDocument()` and `validateDocument()` interfaces for
editors that need to render processed documents with invalid-block fallbacks.

Docs: [contentbit.dev/docs](https://contentbit.dev/docs)
