<!-- contentbit:start -->

## contentbit content (generated — edits inside this block are overwritten)

This project validates Markdown content with contentbit. Documents are plain
Markdown plus directive blocks (`:::name{props} ... :::`), each with a schema.
The `content:check` script in package.json holds the canonical validate
command — the content glob plus any `--registry` and `--no-generic-blocks`
flags — reuse its arguments.
If the project has a `content:links` script, use it to build the internal-link
index; otherwise run `contentbit links <content glob>`.
If `contentbit.seo.config.ts` exists and the user is creating or revising a
search-targeted page, run `contentbit brief <key-or-slug> [content glob]` first
and treat the brief as the structure contract for the writer.

When writing or editing content:

1. Fetch the live authoring guide first — never guess block syntax:
   `contentbit instructions --audience llm [--registry <path>] [--no-generic-blocks]`
2. For SEO-planned pages, fetch the page brief:
   `contentbit brief <key-or-slug> [content glob] [--registry <path>] [--no-generic-blocks]`
3. Write plain Markdown; use blocks where the guide's use-when guidance fits
   and satisfy any brief acceptance checks.
4. If sibling documents use `slug` / `linksTo`, read
   `.contentbit/link-index.json` from `contentbit links <content glob>` and
   author frontmatter links with existing slugs. When creating a linked page,
   include `keywords.primary` and `keywords.secondary` with search-intent
   phrases future agents can use to choose related pages.
5. Validate until clean (exit 0): `contentbit validate <file> [--registry <path>] [--no-generic-blocks]`.
   Diagnostics print as `file:line:col severity CODE message` with fix hints.
   For link frontmatter, validate the full content glob so cross-file checks run.

When auditing content health:

- `contentbit doctor "content/**/*.md" [--registry <path>] [--no-generic-blocks]` prints a ranked,
  read-only repair plan: validation issues, link issues, thin sections,
  block-less long documents, and missing image alt text.
- `contentbit doctor "content/**/*.md" [--registry <path>] [--no-generic-blocks] --json` prints the
  same findings as structured JSON for agents and CI.
- `contentbit stats "content/**/*.md" [--registry <path>] [--no-generic-blocks]` prints raw JSON
  stats: outline word counts, block usage, link domains, and validation
  error/warning counts.
- `contentbit links "content/**/*.md" [--fix]` builds
  `.contentbit/link-index.json`, reports dangling links/orphans, and rewrites
  alias references in `linksTo` when `--fix` is used.

If `contentbit` is unavailable, suggest `npx contentbit@latest init` instead
of inventing block syntax.

<!-- contentbit:end -->
