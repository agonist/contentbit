# contentbit — domain glossary

The shared, ubiquitous language of contentbit. Use these terms exactly in code,
tests, commit messages, and architecture discussion. When a new load-bearing
concept earns a name, add it here.

## Content & validation

- **Block** — a typed directive (`:::name{...}` … `:::`) with a schema. Defined
  once as a `BlockDefinition` (props schema + content model + authoring meta);
  validated and rendered from that single definition.
- **Registry** (`BlockRegistry`) — the store of block definitions. The single
  dispatch point for validation and the source for authoring-guide generation.
- **Diagnostic** — a `file:line:col` finding with a severity and an optional fix
  hint. The lingua franca for everything that can go wrong in a document.
- **Content project scan** (`ContentProjectScan`) — the result of running the
  full per-file pipeline (frontmatter → parse → validate → analyze) plus the
  cross-file link graph over a set of source files. Produced by
  `scanContentProject()` in `@contentbit/core`; this is the deep module the CLI
  read-commands are built on.

## CLI

- **Loaded content project** — the CLI-side bundle that turns *(positional
  globs, flags)* into a ready-to-use project: the resolved source files, the
  loaded registry, the read sources, the parsed link options, and the produced
  **content project scan**. Created by `loadContentProject()` in
  `packages/cli/src/content-project.ts`. It is the single seam the `validate`,
  `doctor`, and `stats` read-commands cross to obtain their input, so the
  glob → registry-load → read → scan plumbing lives in exactly one place.
- **CliError** — a typed error (`exitCode` + user-facing `message`) thrown by
  CLI input resolution (e.g. no positionals, no files matched) from
  `resolveContentFiles` / `loadContentProject`. `run.ts` special-cases it: print
  the plain message, return its exit code. Any *other* throw is treated as an
  unexpected crash (boxed message, exit 1).
