# contentbit

CLI for [Content Blocks](https://contentbit.dev): validate documents, render them, and generate LLM authoring instructions from your registry.

```bash
# validate — exits 1 with file:line:col diagnostics
contentbit validate "content/**/*.md"

# compact LLM context generated from the registry
contentbit instructions --audience llm --out guide.md

# render to static HTML or plain Markdown
contentbit render article.md --target html
```

Point `--registry ./blocks/registry.mjs` at a module to add custom blocks.

Docs: [contentbit.dev/docs](https://contentbit.dev/docs)
