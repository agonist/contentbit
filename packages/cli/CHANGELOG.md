# contentbit

## 0.2.0

### Minor Changes

- [#3](https://github.com/agonist/contentbit/pull/3) [`233245b`](https://github.com/agonist/contentbit/commit/233245b08e07d488861c9345047cf75888710d40) Thanks [@agonist](https://github.com/agonist)! - Coding-agent integration. New `contentbit agents` command (also run by `init`,
  skip with `--no-agents`) installs Claude Code skills — `contentbit-author`
  (fetch the live authoring guide, write, validate until clean) and
  `contentbit-audit` (rank findings from `stats` JSON) — and manages a fenced
  instruction block in `AGENTS.md` for every other agent. Skills hold no schemas;
  they read everything from the CLI at runtime, so custom blocks are picked up
  automatically. `contentbit stats` now accepts multiple files and globs,
  emitting a JSON array (single files keep the flat object shape).

- [`3c57e88`](https://github.com/agonist/contentbit/commit/3c57e884ab41f7f1a668c06e248dffc48439f80b) Thanks [@agonist](https://github.com/agonist)! - First synchronized release — all packages now share the same version number.

  - New `@contentbit/astro` package: renderer-only Astro integration for contentbit documents.
  - New document stats: `analyzeDocument` in `@contentbit/core` and a `contentbit stats` command in the CLI.

### Patch Changes

- Updated dependencies [[`233245b`](https://github.com/agonist/contentbit/commit/233245b08e07d488861c9345047cf75888710d40), [`3c57e88`](https://github.com/agonist/contentbit/commit/3c57e884ab41f7f1a668c06e248dffc48439f80b)]:
  - @contentbit/core@0.2.0
  - @contentbit/blocks@0.2.0
  - @contentbit/html@0.2.0
