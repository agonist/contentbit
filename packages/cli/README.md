# contentbit

CLI for [Content Blocks](https://contentbit.dev): validate documents, build
internal-link indexes, render content, and generate LLM authoring instructions
from your registry.

```bash
# scaffold Content Blocks into any project: deps, starter content,
# a custom-block registry, and LLM authoring instructions
pnpm dlx contentbit@latest init

# validate — exits 1 with file:line:col diagnostics
contentbit validate "content/**/*.md"

# structured JSON stats for one document: outline, word counts,
# block census, links, validation summary — quick context for LLMs
contentbit stats article.md

# internal-link graph from frontmatter slugs, aliases, and linksTo
contentbit links "content/**/*.md"
contentbit links "content/**/*.md" --fix

# compact LLM context generated from the registry
contentbit instructions --audience llm --out guide.md

# render to static HTML or plain Markdown
contentbit render article.md --target html
```

Point `--registry ./blocks/registry.mjs` at a module to add custom blocks.

Docs: [contentbit.dev/docs](https://contentbit.dev/docs)
