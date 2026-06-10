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

Spec: see [`SPEC.md`](./SPEC.md).

## Packages

| Package                  | Purpose                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `@content-blocks/core`   | Parser, AST, diagnostics, registry, validation, content models, authoring guide, Markdown fallback |
| `@content-blocks/blocks` | Generic block definitions (callout, steps, comparison, tabs, faq, ...)                             |
| `@content-blocks/html`   | Static HTML renderer                                                                               |
| `@content-blocks/react`  | React renderer with headless defaults                                                              |
| `content-blocks` (cli)   | validate / render / instructions / docs                                                            |
| `registry/`              | shadcn-distributed styled component pack                                                           |
| `site/`                  | Landing page (Next.js static export) + shadcn registry hosting                                     |
| `docs/`                  | Documentation + playground (Fumadocs)                                                              |

## Development

    pnpm install
    pnpm --filter "@content-blocks/*" test
    pnpm --filter "@content-blocks/*" build
