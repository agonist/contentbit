---
name: contentbit-audit
description: |
  Audit contentbit Markdown content health using document stats. Use when asked
  to audit, review, or find improvements across content — thin pages, missing
  structure, validation issues — in a project that uses contentbit.
version: 8
---

# Auditing contentbit content

`contentbit check` is the first audit command. It reads the pages in the
site's build folder and the Markdown content once. It checks the built pages,
runs block validation, link validation, and document stats on the Markdown,
then prints the findings. Build the site first: without a build folder, only
the Markdown checks run. It is read-only: it does not write the link index and
never edits source files. `contentbit stats` remains useful when you need raw
JSON metrics. `contentbit links` builds the frontmatter-authored internal-link
graph and can heal alias references with `--fix`.
When `contentbit.seo.config.ts` exists, `check` also reports SEO contract
findings, and `contentbit brief <key-or-slug> [content glob]` gives page-level
structure requirements for an agent or human writer.

## Gather

Find the nearest `contentbit.config.*` or workspace package that declares
contentbit (it may be nested in a monorepo), and run commands from that
directory. Project configuration supplies the content glob, registry, link
fields, and SEO config, so run:

```sh
contentbit check
contentbit check --json
contentbit stats
contentbit links
```

`check --json` prints a stable report with summary counts, the built-page
`findings`, and the Markdown findings in `content.findings`. `stats` prints
per-file metrics: frontmatter data, a heading `outline` with per-section word
counts, `blocks.byName` usage counts, `links.domains`, and a `validation`
summary (`errors`/`warnings`).
`contentbit links` writes `.contentbit/link-index.json`, whose pages contain
`slug`, resolved `linksTo`, derived `linkedFrom`, `aliases`, and
`keywords`.

## Interpret

Prioritize findings in this order:

1. **Validation errors and warnings** — broken content ships broken pages.
2. **Built-page errors** — links to missing pages or ids, and source documents
   with no built page. A template finding comes from the layout, so one fix
   clears it on every page it lists.
3. **Internal-link errors** — unresolved links, duplicate slugs, and alias
   conflicts from `contentbit links`.
4. **Orphans and self-links** — link warnings that point to isolated or noisy
   pages.
5. **Thin documents** — outline sections with very low word counts.
6. **Block-less documents** — `blocks.byName` empty where sibling documents
   use blocks; structure (steps, callouts, comparisons, faq) may be missing.
7. **Missing or inconsistent frontmatter** compared to sibling documents.
8. **Structural imbalance** — skipped heading levels, single-section walls of text.
9. **SEO contract findings** — missing page type, required sections, required
   blocks, required link targets, or brief acceptance checks when SEO config is
   present.

## Report

Report findings per file with concrete suggestions, ordered by priority. Do not
edit files during the audit. To fix a finding, follow the contentbit-author
skill (fetch the guide, edit, validate until clean) — offer that as a follow-up.
