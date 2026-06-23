# contentbit

CLI for [contentbit](https://contentbit.dev): initialize projects, validate
structured Markdown blocks, build internal-link indexes, render content, and
give coding agents live authoring instructions from your registry.

Fast path:

```bash
# scaffold packages, starter content, registry, renderer, scripts, and agent files
pnpm dlx contentbit@latest init

# run the generated validate script, including your custom registry
pnpm run content:check

# refresh AGENTS.md and Claude Code skills
contentbit agents
```

Everyday commands:

```bash
# exits 1 with file:line:col diagnostics and fix hints
contentbit validate "content/**/*.md" --registry ./blocks/registry.ts

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

Point `--registry ./blocks/registry.ts` at a module to add custom blocks.
Agents should read the same registry with `contentbit instructions`, write
plain Markdown with registered blocks, then run `contentbit validate` until it
exits 0.

Docs: [contentbit.dev/docs](https://contentbit.dev/docs)
