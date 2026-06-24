# contentbit TanStack starter

This starter is a working TanStack Start project with contentbit already wired:
Markdown content, block validation, internal links, styled React components, and
LLM-agent instructions.

## First run

```bash
pnpm install
pnpm run content:check
pnpm run content:links
pnpm run dev
```

Open `http://localhost:3000/blog` to see the content graph demo.

## What to edit

- `content/*.md` — Markdown documents with contentbit blocks and link frontmatter.
- `blocks/registry.ts` - custom block schemas shared by the CLI, renderer, and LLM agents.
- `blocks/components.tsx` — React renderers for custom blocks.
- `src/components/content-blocks/*` — styled block components installed from the contentbit registry.
- `AGENTS.md` and `contentbit-guide.md` - instructions your LLM agent reads before writing.

## LLM-agent workflow

Ask your LLM agent to write or audit content:

```text
write a blog post about espresso ratios
audit my content
```

The LLM agent should fetch the live guide with `contentbit instructions`, write
plain Markdown with registered blocks, run `pnpm run content:check`, and fix
diagnostics until validation exits 0.

Refresh the generated agent files at any time:

```bash
pnpm exec contentbit agents
```
