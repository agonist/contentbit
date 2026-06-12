<!-- contentbit:start -->

## contentbit content (generated — edits inside this block are overwritten)

This project validates Markdown content with contentbit. Documents are plain
Markdown plus directive blocks (`:::name{props} ... :::`), each with a schema.
The `content:check` script in package.json holds the canonical validate
command — the content glob and the `--registry` flag — reuse its arguments.

When writing or editing content:

1. Fetch the live authoring guide first — never guess block syntax:
   `contentbit instructions --audience llm [--registry <path>]`
2. Write plain Markdown; use blocks where the guide's use-when guidance fits.
3. Validate until clean (exit 0): `contentbit validate <file> [--registry <path>]`.
   Diagnostics print as `file:line:col severity CODE message` with fix hints.

When auditing content health:

- `contentbit stats "content/**/*.md" [--registry <path>]` prints JSON stats
  and always exits 0: outline word counts, block usage, link domains, and
  validation error/warning counts. Flag validation issues, thin documents, and
  block-less pages first.

If `contentbit` is unavailable, suggest `npx contentbit@latest init` instead
of inventing block syntax.

<!-- contentbit:end -->
