# Content Blocks

Structured Markdown components without framework lock-in.

Content Blocks is a framework-agnostic block layer for Markdown. Authors (humans,
LLMs, CMSes) write Markdown with directive-style blocks:

    :::comparison{left="Basic" right="Pro"}
    - Price | Free | $12/mo
    - Support | Community | Priority
    :::

The library parses to a source-mapped AST, validates against explicit per-block
schemas with line-level diagnostics, and renders through adapters (static HTML,
React, plain-Markdown fallback). Authoring instructions for LLMs are generated
from the same registry that validates content, so prompts never drift from rules.

Docs: [contentbit.dev/docs](https://contentbit.dev/docs).

## Packages

| Package                  | Purpose                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `@contentbit/core`   | Parser, AST, diagnostics, registry, validation, content models, authoring guide, Markdown fallback |
| `@contentbit/blocks` | Generic block definitions (callout, steps, comparison, tabs, faq, ...)                             |
| `@contentbit/html`   | Static HTML renderer                                                                               |
| `@contentbit/react`  | React renderer with headless defaults                                                              |
| `contentbit` (cli)   | validate / render / instructions / docs                                                            |
| `registry/`              | shadcn-distributed styled component pack                                                           |
| `site/`                  | Landing, docs (Fumadocs at /docs), blocks gallery, example article, playground, registry hosting   |

## Development

    pnpm install
    pnpm --filter "@contentbit/*" test
    pnpm --filter "@contentbit/*" build
