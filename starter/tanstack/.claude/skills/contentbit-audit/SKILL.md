---
name: contentbit-audit
description: |
  Audit contentbit Markdown content health using document stats. Use when asked
  to audit, review, or find improvements across content — thin pages, missing
  structure, validation issues — in a project that uses contentbit.
version: 1
---

# Auditing contentbit content

`contentbit stats` analyzes documents and prints JSON to stdout. It is a read
tool: it always exits 0, even when documents have validation errors.

## Gather

Check `package.json` for the `content:check` script to find this project's
content glob and `--registry` flag, then:

```sh
contentbit stats "content/**/*.md" [--registry <path>]
```

One matched file prints a single stats object; multiple files print an array.
Each entry includes the file path, frontmatter data, a heading `outline` with
per-section word counts, `blocks.byName` usage counts, `links.domains`, and
a `validation` summary (`errors`/`warnings`).

## Interpret

Prioritize findings in this order:

1. **Validation errors and warnings** — broken content ships broken pages.
2. **Thin documents** — outline sections with very low word counts.
3. **Block-less documents** — `blocks.byName` empty where sibling documents
   use blocks; structure (steps, callouts, comparisons, faq) may be missing.
4. **Missing or inconsistent frontmatter** compared to sibling documents.
5. **Structural imbalance** — skipped heading levels, single-section walls of text.

## Report

Report findings per file with concrete suggestions, ordered by priority. Do not
edit files during the audit. To fix a finding, follow the contentbit-author
skill (fetch the guide, edit, validate until clean) — offer that as a follow-up.
