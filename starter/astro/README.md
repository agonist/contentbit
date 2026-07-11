# contentbit Astro starter

This starter is a working Astro project with contentbit already wired: Markdown
content, block validation, internal links, styled Astro components, and LLM-agent
instructions.

## First run

```bash
pnpm install
pnpm run content:check
pnpm run content:links
pnpm run content:doctor
pnpm run studio
```

Open `http://localhost:4377` to inspect Studio, then stop it and run the app:

```bash
pnpm run dev
```

Open `http://localhost:4321/blog` to see the content graph demo.

Before publishing starter changes, run the same gates as CI:

```bash
pnpm run check
```

## What to edit

- `content/*.md` — Markdown documents with contentbit blocks and link frontmatter.
- `blocks/registry.ts` - custom block schemas shared by the CLI, renderer, and LLM agents.
- `blocks/QuoteBlock.astro` — the Astro renderer for the starter custom block.
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
