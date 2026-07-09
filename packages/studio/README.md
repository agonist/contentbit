# @contentbit/studio

Read-only local Studio for contentbit projects.

Studio is launched by the `contentbit` CLI:

```bash
pnpm add -D @contentbit/studio
contentbit studio
```

`contentbit.config.ts` supplies the content glob and registry. Explicit globs
and flags still override it for one invocation.

New projects created with `contentbit init` get a shorter script:

```bash
pnpm studio
```

The app scans matched content files and opens a localhost TanStack Start +
shadcn dashboard with:

- health counters and ranked findings
- document search, filters, and sortable file table
- block usage and keyword coverage
- internal-link graph summary
- document previews, source, stats, outgoing links, backlinks, keywords, and
  findings

Studio automatically loads React block components from the registry folder when
it finds `components.tsx`, `components.ts`, `preview.tsx`, `preview.ts`,
`renderers.tsx`, or `renderers.ts`. If you installed the shadcn pack, Studio
also looks for copied `components/content-blocks/content-renderer.tsx` files and
uses their exported `styledComponents`.

Studio is intentionally read-only in v1. It does not edit source files, write
`.contentbit/link-index.json`, or run `contentbit links --fix`.

CLI options:

```bash
contentbit studio <globs...> \
  --registry ./blocks/registry.ts \
  --port 4377 \
  --host 127.0.0.1 \
  --no-generic-blocks \
  --no-open
```

The CLI binds `127.0.0.1` by default, starts at port `4377` and lets Vite choose
the next free port, and opens the browser unless `--no-open` is passed.
Studio loads the generic block definitions by default; pass `--no-generic-blocks`
when your registry should own the full block set.
