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
| `packages/react`  | React renderer                                                  |
| `packages/astro`  | Astro renderer                                                  |
| `packages/cli`    | The `contentbit` CLI (init, validate, render, instructions)     |
| `registry/`       | Source of the shadcn-distributed styled pack                    |
| `site/`           | contentbit.dev: landing, docs, blog, playground, registry files |

## Guidelines

- Every behavior change comes with a test. The packages are small and fully
  tested; keep them that way.
- Block definitions stay framework-free. Renderers are adapters; React code
  never leaks into `core` or `blocks`.
- The styled pack's canonical source is `registry/src/blocks`; the site imports
  it directly through the `@contentbit-registry/*` path alias.
- Content files (`site/content/**`) are parser input. The formatter ignores
  them on purpose; whitespace is significant.
- Docs pages double as tests: `<Live>` examples run through the real parser at
  build time, and blog posts fail the build if they have diagnostics.

## Changesets

Releases are managed with [changesets](https://github.com/changesets/changesets).
If your PR changes published behavior in any package, add a changeset:

```bash
pnpm changeset
```

Pick the affected packages, the bump level (patch/minor/major), and write a
short user-facing description — it becomes the changelog entry. Commit the
generated file in `.changeset/` with your PR. Docs/site/internal-only changes
don't need one.

## Releasing

All publishable packages share one version (fixed/lockstep mode). On every
push to main, the release workflow keeps a "Version Packages" PR up to date
with the pending changesets. Merging that PR bumps versions, updates
changelogs, publishes to npm, and creates GitHub releases. Nothing publishes
until that PR is merged.
