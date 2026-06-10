# @contentbit/html

Static HTML renderer for [Content Blocks](https://contentbit.dev) documents. No framework, and the output works without JavaScript.

```ts
import { renderToHtml } from '@contentbit/html'

const html = renderToHtml(result.document, {
  renderMarkdown: (md) => myMarkdownPipeline(md),
})
```

All user content is escaped. `onInvalid` controls error handling: `strict`, `annotated`, or `fallback`.

Docs: [contentbit.dev/docs/guides/renderers](https://contentbit.dev/docs/guides/renderers)
