# @contentbit/core

## 0.2.0

### Minor Changes

- [#3](https://github.com/agonist/contentbit/pull/3) [`233245b`](https://github.com/agonist/contentbit/commit/233245b08e07d488861c9345047cf75888710d40) Thanks [@agonist](https://github.com/agonist)! - Authoring guides now document every prop from the block's schema: name, type
  (with enum values spelled out), required/optional, default value, and the
  `.describe()` text. Previously props were only visible through examples, so an
  agent obeying "never guess props" could not discover optional props the example
  didn't use.

- [`3c57e88`](https://github.com/agonist/contentbit/commit/3c57e884ab41f7f1a668c06e248dffc48439f80b) Thanks [@agonist](https://github.com/agonist)! - First synchronized release — all packages now share the same version number.

  - New `@contentbit/astro` package: renderer-only Astro integration for contentbit documents.
  - New document stats: `analyzeDocument` in `@contentbit/core` and a `contentbit stats` command in the CLI.
