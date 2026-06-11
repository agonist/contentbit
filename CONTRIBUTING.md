# Contributing

Thanks for looking into contentbit. Issues and PRs welcome.

## Setup

Requires Node >= 22.18 and pnpm (pinned via `packageManager`).

```bash
pnpm install
pnpm -r build
pnpm -r test
```

Lint and formatting run from the root: `pnpm lint` (oxlint) and `pnpm fmt`
(oxfmt). CI enforces both plus builds and tests on every PR.

## Repo layout

| Path        | What                                                                  |
| ----------- | --------------------------------------------------------------------- |
| `packages/core`   | Parser, AST, diagnostics, registry, validation                  |
| `packages/blocks` | Generic block definitions                                       |
| `packages/html`   | Static HTML renderer                                            |
| `packages/react`  | React renderer                                                  |
| `packages/cli`    | The `contentbit` CLI (init, validate, render, instructions)     |
| `registry/`       | Source of the shadcn-distributed styled pack                    |
| `site/`           | contentbit.dev: landing, docs, blog, playground, registry files |

## Guidelines

- Every behavior change comes with a test. The packages are small and fully
  tested; keep them that way.
- Block definitions stay framework-free. Renderers are adapters; React code
  never leaks into `core` or `blocks`.
- The styled pack's canonical source is `registry/src/blocks`. The copy in
  `site/components/content-blocks` mirrors it; change both.
- Content files (`site/content/**`) are parser input. The formatter ignores
  them on purpose; whitespace is significant.
- Docs pages double as tests: `<Live>` examples run through the real parser at
  build time, and blog posts fail the build if they have diagnostics.

## Releasing

Versions are bumped manually per package. `pnpm -r publish` from a clean main
publishes whatever is ahead of npm and skips the rest.
