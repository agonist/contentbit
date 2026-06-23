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

**The agent-friendly content layer for Markdown.**

Run one command, then ask your coding agent to write content. contentbit gives
the agent a live authoring guide, validates every structured block, and renders
the same document in React, Astro, static HTML, or plain Markdown.

Use it when Markdown is still the right authoring format, but free-form
Markdown is too loose for production content. Authors and agents write normal
Markdown plus directive blocks:

```md
:::comparison{left="Basic" right="Pro"}
- Price | Free | $12/mo
- Support | Community | Priority
:::
```

Every block has a schema. Invalid content fails before render with diagnostics
a human or model can fix:

```text
article.md:12:1 error CB_PROPS_INVALID
:::callout props invalid: type must be one of note|tip|warning|important|tldr.
hint: Did you mean type="warning"?
```

The same registry that validates content also generates the agent instructions,
so your schemas, docs, and prompts stay in sync.

## Quick start

```bash
npx contentbit@latest init
pnpm run content:check   # use the package manager init picked
```

Then ask your agent:

```text
write a blog post about our new dark mode
```

`init` detects your framework and package manager, installs the right packages,
creates starter content, wires a rendered `/example` page when possible, adds
validation scripts, generates an authoring guide, and installs the agent
instructions.

Prefer the pieces? `pnpm add @contentbit/core @contentbit/blocks` plus the
renderer of your choice. Full walkthrough:
[contentbit.dev/docs](https://contentbit.dev/docs).

## What you get

| File or command          | Why it matters                                                                 |
| ------------------------ | ------------------------------------------------------------------------------ |
| `content/example.md`     | A working Markdown document with built-in blocks and one custom block          |
| `blocks/registry.ts`     | The block schema registry shared by the CLI, renderers, docs, and agents      |
| `content:check`          | A package script that runs `contentbit validate` with the right content glob   |
| `contentbit-guide.md`    | Generated authoring rules your agent can read before writing                  |
| `AGENTS.md`              | Compact repo instructions for Codex, Cursor, Copilot, and other coding agents |
| `.claude/skills/*`       | Claude Code author/audit skills when a `.claude` directory is present         |
| `/example`               | A rendered page when your framework supports it (TanStack Start, Next.js, Astro) |

## Agent loop

After `init`, your agent has enough context to write and repair content:

1. Read the project's `content:check` script to find the content glob and
   registry.
2. Run `contentbit instructions --audience llm` to fetch the live block guide.
3. Write plain Markdown, using blocks only when the guide says they fit.
4. Run `contentbit validate ...` and fix every diagnostic until it exits 0.
5. For audits, run `contentbit stats ...` and rank real content issues.

Refresh or add the integration at any time:

```bash
contentbit agents
```

The skills hold no schemas; they read everything from the CLI at runtime, so
custom blocks are picked up automatically. See
[contentbit.dev/docs/guides/agents](https://contentbit.dev/docs/guides/agents).

## Internal links

Author content relationships in frontmatter and let contentbit keep the graph
honest:

```yaml
---
slug: beginner-pizza-dough
linksTo:
  - cold-fermentation-pizza
aliases:
  - intro-pizza-dough
keywords:
  primary: how to make pizza dough
---
```

`contentbit links "content/**/*.md"` writes `.contentbit/link-index.json` with
resolved `linksTo` and derived `linkedFrom` backlinks. `contentbit validate`
runs the same link checks automatically when files declare slugs, and
`contentbit links --fix` rewrites stale alias references in `linksTo`.

## Without an agent

The loop above is just CLI commands, so you can drive it by hand: generate the
guide with `contentbit instructions --audience llm`, write plain Markdown with
registered blocks, run `contentbit validate "content/**/*.md" --registry
./blocks/registry.ts` until it's clean, then render anywhere — React, Astro,
static HTML, or plain Markdown.

## Packages

| Package              | Purpose                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `@contentbit/core`   | Parser, AST, diagnostics, registry, validation, content models, authoring guide, Markdown fallback |
| `@contentbit/blocks` | Generic block definitions (callout, steps, comparison, tabs, faq, ...)                             |
| `@contentbit/html`   | Static HTML renderer, works without JavaScript                                                     |
| `@contentbit/react`  | React renderer with headless accessible defaults                                                   |
| `@contentbit/astro`  | Astro renderer: `.astro` components with per-block overrides                                       |
| `contentbit`         | CLI: init / validate / stats / links / render / instructions / docs / agents                       |

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
