<p align="center">
  <a href="https://contentbit.dev">
    <img src="https://contentbit.dev/opengraph-image" alt="contentbit" width="640" />
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/contentbit"><img src="https://img.shields.io/npm/v/contentbit?label=contentbit&color=10b981" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/@contentbit/core"><img src="https://img.shields.io/npm/v/@contentbit/core?label=%40contentbit%2Fcore&color=10b981" alt="npm" /></a>
  <a href="https://github.com/agonist/contentbit/actions/workflows/ci.yml"><img src="https://github.com/agonist/contentbit/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT" /></a>
</p>

# contentbit

**Structured Markdown components without framework lock-in.**
`npx contentbit@latest init`, then ask your coding agent to write a post — it
fetches the live authoring guide, writes, and validates until clean.

LLMs are fluent in Markdown, and that fluency is the problem: generated content
*looks* right and breaks in production. Content Blocks is a content protocol
that fixes the interface. Authors (humans, CMSes, LLMs) write plain Markdown
with directive blocks:

```md
:::comparison{left="Basic" right="Pro"}
- Price | Free | $12/mo
- Support | Community | Priority
:::
```

Every block has a schema. Validation runs before anything renders and produces
`file:line:col` diagnostics a human or a model can act on. The same registry
that validates content also generates the LLM authoring instructions, so
schema, docs, and prompts can never drift apart.

```text
article.md:12:1 error CB_PROPS_INVALID
:::callout props invalid: type must be one of note|tip|warning|important|tldr.
hint: Did you mean type="warning"?
```

## Quick start

```bash
npx contentbit@latest init
```

One command: detects your framework and package manager, installs the
packages, scaffolds a starter document, a custom block, and a rendered
`/example` page, generates LLM authoring instructions, and wires in your
coding agent. In shadcn projects it also installs the styled component pack.

Prefer the pieces? `pnpm add @contentbit/core @contentbit/blocks` plus the
renderer of your choice. Full walkthrough:
[contentbit.dev/docs](https://contentbit.dev/docs).

## Ask your agent

After `init`, your agent knows how to write content for this project:

> "write a blog post about X" &nbsp;·&nbsp; "audit my content"

`contentbit agents` (included in `init`) installs Claude Code skills and an
`AGENTS.md` block, so writing fetches the live guide and validates until clean,
and auditing ranks findings from `contentbit stats` JSON. The skills hold no
schemas; they read everything from the CLI at runtime, so custom blocks are
picked up automatically. See
[contentbit.dev/docs/guides/agents](https://contentbit.dev/docs/guides/agents).

## The loop

What runs under the hood — yourself or via the skills:

1. Generate the authoring guide from your registry: `contentbit instructions --audience llm`
2. Let the model write plain Markdown with blocks. Nothing executable.
3. Validate: `contentbit validate "content/**/*.md"` exits 1 with precise diagnostics.
4. Feed diagnostics back to the model until clean. Render anywhere: React, Astro, static HTML, or plain Markdown.

## Packages

| Package              | Purpose                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `@contentbit/core`   | Parser, AST, diagnostics, registry, validation, content models, authoring guide, Markdown fallback |
| `@contentbit/blocks` | Generic block definitions (callout, steps, comparison, tabs, faq, ...)                             |
| `@contentbit/html`   | Static HTML renderer, works without JavaScript                                                     |
| `@contentbit/react`  | React renderer with headless accessible defaults                                                   |
| `@contentbit/astro`  | Astro renderer: `.astro` components with per-block overrides                                       |
| `contentbit`         | CLI: init / validate / stats / render / instructions / docs / agents                               |

The styled component pack ships through a shadcn registry:
`pnpm dlx shadcn@latest add @contentbit/generic-pack`
(registry: `https://contentbit.dev/r/{name}.json`).

## Explore

- [Docs](https://contentbit.dev/docs), with every example rendered live by the library
- [All blocks](https://contentbit.dev/blocks), the generic pack with authoring guidance
- [Playground](https://contentbit.dev/playground), validates as you type
- [Blog](https://contentbit.dev/blog), every post is a validated Content Blocks document
- [Changelog](https://contentbit.dev/docs/changelog), what shipped in each release
- [llms.txt](https://contentbit.dev/llms.txt) / [authoring guide](https://contentbit.dev/contentbit-guide.md) for agents

## Development

```bash
pnpm install
pnpm -r build
pnpm -r test
pnpm lint && pnpm fmt:check
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the repo layout and guidelines.

## License

[MIT](./LICENSE)
