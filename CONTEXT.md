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
- **Processed document** (`ProcessedDocumentNode`) — a parsed document whose
  blocks have been checked and enriched where valid. Preview adapters accept it
  so they can render invalid-block fallbacks.
- **Validated document** (`ValidatedDocumentNode`) — a processed document with
  no error diagnostics. Strict render/export paths obtain one through
  `assertValidDocument()`.
- **Content project scan** (`ContentProjectScan`) — the result of running the
  full per-file pipeline (frontmatter → parse → validate → analyze) plus the
  cross-file link graph over a set of source files. Produced by
  `scanContentProject()` in `@contentbit/core`; this is the deep module the CLI
  read-commands are built on.
- **Page facts** (`ContentPageFacts`) — the canonical page-level facts derived
  from frontmatter for a document: identity (`key`, `slug`, `locale`), title,
  description, type, intent, keywords, and declared outgoing links. Page facts
  normalize project-specific field names and accepted aliases such as
  `seoKeywords` before SEO, links, or Studio read them.
- **Discovered page facts** (`DiscoveredContentPageFacts`) — page facts resolved
  from the strongest information currently available, with provenance and
  confidence attached to every value. Authored/configured facts are exact;
  document and path fallbacks let Adoption understand unconfigured libraries
  without presenting guesses as authored truth.
- **Content project discovery** (`DiscoveredContentProject`) — the portable,
  read-only view that resolves discovered page facts relative to a project root
  and conservatively groups repeated path patterns into likely families and
  locales. Adoption is its first adapter; Cloud and snapshots can consume the
  same interface later.
- **Content project snapshot** (`ContentProjectSnapshot`) — the versioned,
  JSON-safe project read model returned by `inspectContentProject()`. It keeps
  page facts, hashes, statistics, findings, families, locales, and graph data
  while excluding raw Markdown, validation ASTs, registries, absolute paths,
  and other runtime-only objects. The CLI exposes the same interface through
  `contentbit snapshot`.
- **Link graph view** (`LinkGraphView`) — the read model of a link index for
  adapters that need graph-shaped data: summary, nodes, edges, and edge status.
  It is derived from the link index and structured link diagnostics, not from
  formatted diagnostic messages.

## CLI

- **Contentbit config** (`contentbit.config.ts`) — the project-wide source for
  content globs, registry location, generic-block policy, link resolution, and
  SEO config. CLI flags override it for one invocation; package-script parsing
  remains a compatibility fallback.

- **Loaded content project** — the Node-side bundle that turns *(positional
  globs, flags)* into a ready-to-use project: the resolved source files, the
  loaded registry, the read sources, the parsed link options, and the produced
  **content project scan**. Created by `loadContentProject()` in the internal
  workspace package `@contentbit/project`. It is the single seam the `validate`,
  `doctor`, `stats`, `brief`, and Studio read paths cross to obtain their input,
  so the glob → registry-load → read → scan plumbing lives in exactly one place
  without publishing another runtime package.
- **CliError** — a typed error (`exitCode` + user-facing `message`) thrown by
  CLI input resolution (e.g. no positionals, no files matched) from
  `resolveContentFiles` / `loadContentProject`. `run.ts` special-cases it: print
  the plain message, return its exit code. Any *other* throw is treated as an
  unexpected crash (boxed message, exit 1).
