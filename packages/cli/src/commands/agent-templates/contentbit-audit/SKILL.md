---
name: contentbit-audit
description: |
  Audit contentbit Markdown content health using document stats. Use when asked
  to audit, review, or find improvements across content — thin pages, missing
  structure, validation issues — in a project that uses contentbit.
version: 4
---

# Auditing contentbit content

`contentbit doctor` is the first audit command. It reads content once, runs
block validation, link validation, and document stats, then prints a ranked
repair plan. It is read-only: it does not write the link index and never edits
source files. `contentbit stats` remains useful when you need raw JSON metrics.
`contentbit links` builds the frontmatter-authored internal-link graph and can
heal alias references with `--fix`.

## Gather

Check `package.json` for `content:doctor` first. If it exists, run it. If it
does not, use `content:check` to find this project's content glob and
`--registry` / `--no-generic-blocks` flags, then run:

```sh
contentbit doctor "content/**/*.md" [--registry <path>] [--no-generic-blocks]
contentbit doctor "content/**/*.md" [--registry <path>] [--no-generic-blocks] --json
contentbit stats "content/**/*.md" [--registry <path>] [--no-generic-blocks]
contentbit links "content/**/*.md"
```

`doctor --json` prints a stable report with summary counts and ranked
findings. `stats` prints per-file metrics: frontmatter data, a heading
`outline` with per-section word counts, `blocks.byName` usage counts,
`links.domains`, and a `validation` summary (`errors`/`warnings`).
`contentbit links` writes `.contentbit/link-index.json`, whose pages contain
`slug`, resolved `linksTo`, derived `linkedFrom`, `aliases`, and
`keywords`.

## Interpret

Prioritize findings in the order `doctor` reports them:

1. **Validation errors and warnings** — broken content ships broken pages.
2. **Internal-link errors** — unresolved links, duplicate slugs, and alias
   conflicts from `contentbit links`.
3. **Orphans and self-links** — link warnings that point to isolated or noisy
   pages.
4. **Thin documents** — outline sections with very low word counts.
5. **Block-less documents** — `blocks.byName` empty where sibling documents
   use blocks; structure (steps, callouts, comparisons, faq) may be missing.
6. **Missing or inconsistent frontmatter** compared to sibling documents.
7. **Structural imbalance** — skipped heading levels, single-section walls of text.

## Report

Report findings per file with concrete suggestions, ordered by priority. Do not
edit files during the audit. To fix a finding, follow the contentbit-author
skill (fetch the guide, edit, validate until clean) — offer that as a follow-up.
