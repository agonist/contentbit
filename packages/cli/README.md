# contentbit

CLI for [contentbit](https://contentbit.dev): initialize projects, validate
structured Markdown blocks, print ranked health reports, build internal-link
indexes, render content, and give LLMs live authoring instructions from your
registry.

Fast path:

```bash
# scaffold packages, starter content, registry, renderer, scripts, and LLM-agent files
pnpm dlx contentbit@latest init

# run the generated validate script, including your custom registry
pnpm run content:check

# open the local read-only Studio dashboard
pnpm run studio

# inspect validation, links, and content-quality suggestions together
pnpm run content:doctor

# refresh AGENTS.md and Claude Code skills for LLM agents
contentbit agents
```

Everyday commands:

```bash
# exits 1 with file:line:col diagnostics and fix hints
contentbit validate "content/**/*.md" --registry ./blocks/registry.ts

# ranked repair plan: validation, links, thin sections, block-less long docs,
# and missing image alt text; add --json for agents/CI
contentbit doctor "content/**/*.md" --registry ./blocks/registry.ts

# local read-only web app for previews, stats, diagnostics, links, and keywords
contentbit studio "content/**/*.md" --registry ./blocks/registry.ts
contentbit studio "content/**/*.md" --registry ./blocks/registry.ts --no-open

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
LLM agents should read the same registry with `contentbit instructions`, write
plain Markdown with registered blocks, then run `contentbit validate` until it
exits 0.

Docs: [contentbit.dev/docs](https://contentbit.dev/docs)
