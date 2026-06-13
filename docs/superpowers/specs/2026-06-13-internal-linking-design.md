# Internal Linking — Design

**Date:** 2026-06-13
**Status:** Approved (design), pending implementation plan

## Context

contentbit content is generated through an LLM pipeline. To reinforce SEO, pages
should cross-link to related pages, and that link graph should be **correct** —
no dangling links, no silently-broken references after a rename. In another
project this was done with a hand-maintained `contentRegistry` array carrying
both `linksTo` and `linkedFrom` per page; the backlinks drift out of sync the
moment someone forgets to update both sides.

This feature brings cross-linking into contentbit as a **data + validation
layer**. The link graph is authored in frontmatter (single source of truth),
derived data (backlinks, resolved graph) is generated into an index artifact,
and broken links surface as ordinary `contentbit validate` diagnostics so they
fail CI early. Rendering of links is explicitly **out of scope** — the host app
decides how/whether to render them, matching contentbit's renderer-agnostic
philosophy (e.g. the Astro package is renderer-only).

### Goals

- Author the link graph in frontmatter; never hand-maintain backlinks.
- Build a fast, cached index by reading **only frontmatter** (not full bodies).
- Catch broken/dangling links as `validate` errors; surface orphans as warnings.
- Survive renames via per-page `aliases` with a safe `--fix` rewrite.

### Non-goals (v1)

- No inline link syntax, no `:::related` block, no renderer changes.
- No deep YAML support beyond one level of nesting (see Workstream A).
- No automatic link *suggestion* — keywords are indexed for future use only.

## Data model (authored frontmatter)

Authored fields only. Anything not listed is derived and never written to source.

```yaml
---
slug: beginner-pizza-dough          # unique id; required to participate
linksTo:                            # outbound internal links (slugs)
  - cold-fermentation-pizza
  - detroit-pizza-dough
aliases:                            # former slugs this page absorbed (optional)
  - intro-pizza-dough
keywords:                           # optional; indexed for future link-suggestion
  primary: how to make pizza dough
  secondary: [easy pizza dough recipe, homemade pizza dough]
---
```

- A file with **none** of these fields is a non-participating page (no breakage
  for existing content).
- A file with `slug` participates. `linksTo` / `aliases` / `keywords` optional.

Validated by a new Zod schema in core. The schema is lenient about absence
(everything optional except that `slug` is required to participate) and strict
about shape (e.g. `linksTo` must be a string array of slug-like values).

## Architecture

Five workstreams, each independently testable.

### Workstream A — Extend the frontmatter parser for one-level nesting

`packages/core/src/frontmatter.ts` currently returns nested mappings as a raw
string (verified: `keywords: { primary, secondary }` comes back as the literal
string `"primary: ...\nsecondary: [...]"`). To support the `keywords` shape,
extend the parser to handle **one level** of nested mapping:

```yaml
keywords:
  primary: how to make pizza dough
  secondary: [easy pizza dough recipe, homemade pizza dough]
```

→ `{ keywords: { primary: "...", secondary: ["...", "..."] } }`

Constraints:
- Support exactly one level of nesting. Anything deeper keeps the **existing
  raw-string fallback** (no throw, no behavior change for deep structures).
- Reuse the existing scalar/inline-array/dash-list value parsing for the nested
  values — a nested mapping is "indented `key: value` lines under a key with an
  empty value".
- This touches a shared, well-tested parser. It is its own workstream with its
  own tests covering: nested mapping, nested mapping mixed with flat keys,
  deeper-than-one-level (stays raw), and all existing cases still passing.

Key file: `packages/core/src/frontmatter.ts` (+ `frontmatter.test.ts`).

### Workstream B — Link schema + types

A new core module defines the authored-frontmatter schema and the index types.

```ts
// Authored shape (Zod)
const LinkFrontmatter = z.object({
  slug: z.string().min(1),
  linksTo: z.array(z.string()).optional(),
  aliases: z.array(z.string()).optional(),
  keywords: z.object({
    primary: z.string().optional(),
    secondary: z.array(z.string()).optional(),
  }).optional(),
  title: z.string().optional(),   // read if present, for index display
})

interface IndexedPage {
  slug: string
  path: string
  title?: string
  keywords?: { primary?: string; secondary?: string[] }
  linksTo: string[]      // authored, resolved through aliases
  linkedFrom: string[]   // DERIVED — who links here
  aliases: string[]
}

interface LinkIndex {
  pages: Map<string, IndexedPage>   // slug -> page
  aliases: Map<string, string>      // oldSlug -> currentSlug
}
```

Key file: `packages/core/src/links/schema.ts` (or similar; follow existing core
module layout — flat files under `src/` per current convention).

### Workstream C — Index builder (pure)

A pure function that takes a list of `{ path, frontmatterData }` and returns a
`LinkIndex`. **No I/O** inside it (I/O lives in the CLI layer), so it is fully
unit-testable.

Two passes:
1. Collect every page with a `slug`; register `aliases` into the alias map.
2. Resolve each `linksTo` (rewrite any alias → current slug); invert edges to
   populate `linkedFrom`.

Serializable to `.contentbit/link-index.json` for the pipeline to read without
rebuilding. Built by reading **only frontmatter** via `extractFrontmatter()` —
never parsing full bodies — which is what keeps it fast (hundreds of pages =
reading small YAML heads, not rendering).

Key file: `packages/core/src/links/index-builder.ts`.

### Workstream D — Link validation (diagnostics)

A `validateLinks(index)` function emitting `Diagnostic`s with the existing
`CB_*` machinery:

| Code | Severity | Trigger |
|------|----------|---------|
| `CB_LINK_UNRESOLVED` | error | `linksTo` a slug that isn't a real slug or known alias; includes a closest-match did-you-mean hint |
| `CB_SLUG_DUPLICATE` | error | two files claim the same slug |
| `CB_ALIAS_CONFLICT` | error | an alias collides with a real slug or another alias |
| `CB_LINK_SELF` | warning | a page lists its own slug in `linksTo` |
| `CB_LINK_ORPHAN` | warning | a page has a slug but zero `linkedFrom` |
| `CB_LINK_ASYMMETRY` | warning | A→B but not B→A (configurable; may default off if noisy) |

Reuses `Diagnostic` / severity / formatting from
`packages/core/src/diagnostics.ts`. For the did-you-mean hint, reuse any
existing closest-match helper if one exists in core; otherwise a small
Levenshtein helper local to the links module.

Key file: `packages/core/src/links/validate-links.ts`.

### Workstream E — CLI surface

Wire the above into the CLI, following the existing command pattern
(`packages/cli/src/commands/*.ts`, dispatched from `run.ts`).

- **`contentbit links [globs]`** — build the index, write
  `.contentbit/link-index.json`, print a summary (page count, edge count,
  orphan count), and run link validation. Exits 1 on link errors.
- **`contentbit links --fix [globs]`** — auto-healing pass: for every `linksTo`
  entry pointing at a **known alias**, rewrite it in the source frontmatter to
  the current slug. Deterministic and safe — it only ever resolves alias →
  current; it never invents, removes, or reorders links, and never writes
  `linkedFrom`. Reports each change.
- **`contentbit validate`** — gains the link checks **automatically** whenever
  link frontmatter is present (zero-config; the gate can't be forgotten).
  Pages with no link frontmatter are unaffected.

  Note on the boundary: per-document `validateDocument` in
  `packages/core/src/validate.ts` stays single-file and unchanged. Link
  validation is inherently **cross-file**, so the `validate` *command* (which
  already has all matched files in hand) builds the index across the file set
  and runs `validateLinks` once, merging those diagnostics into its report.
  The cross-file check lives in the CLI command, not in the per-document core
  validator.

Key files: `packages/cli/src/commands/links.ts`, `packages/cli/src/run.ts`
(register command), `packages/cli/src/commands/validate.ts` (build the index
across the matched file set and run `validateLinks` when link data is present —
the cross-file check lives here, not in core's per-document validator).

## Derived data placement

`linkedFrom` and the resolved graph live **only** in
`.contentbit/link-index.json`. Source `.md` frontmatter holds authored data
only. `--fix` touches source frontmatter solely for alias→current slug
rewrites. This keeps git churn minimal and authored-vs-derived cleanly
separated.

## Data flow

```
.md files ──(extractFrontmatter, head only)──► [{path, fmData}]
                                                      │
                                          (Zod validate authored shape)
                                                      │
                                          ┌───────────▼───────────┐
                                          │  index-builder (pure)  │
                                          │  pass1: collect+alias  │
                                          │  pass2: resolve+invert │
                                          └───────────┬───────────┘
                                                      │ LinkIndex
                                   ┌──────────────────┼──────────────────┐
                                   ▼                  ▼                  ▼
                          validate-links     .contentbit/          summary
                          (CB_* diagnostics) link-index.json       (counts)
                                   │
                          flows through `contentbit validate` gate
```

The LLM pipeline reads `.contentbit/link-index.json` and, when generating page
X, injects a compact candidate list (`{slug, title, keywords}` — a few KB) into
context. Full bodies are never injected.

## Error handling

- Authored-shape violations (e.g. `linksTo` is a string not an array) →
  `CB_LINK_*` diagnostics, never thrown exceptions, matching the parser's
  no-throw contract.
- Missing `.contentbit/` dir → created on write.
- `--fix` is dry-reportable: it prints what it changed; rewrites are limited to
  the narrow alias-resolution case so they're always safe to apply.

## Testing

- **Workstream A:** `frontmatter.test.ts` — nested mapping parses; mixed
  flat+nested; deeper-than-one-level stays raw; all existing cases pass.
- **Workstream C:** index-builder unit tests — backlink derivation, alias
  resolution in `linksTo`, duplicate-slug detection, self-link, orphan.
- **Workstream D:** validate-links unit tests — one fixture per `CB_*` code,
  asserting code + severity + (for unresolved) the did-you-mean hint.
- **Workstream E:** CLI tests following existing `commands/*.test.ts` pattern —
  `links` writes index + correct exit code; `links --fix` rewrites only alias
  links and leaves everything else byte-identical; `validate` fails on a
  dangling link in a fixture project.

### End-to-end verification

1. Create a fixture content dir with 3–4 pages: valid cross-links, one dangling
   `linksTo`, one renamed page (old slug in another page's `linksTo`, new slug
   in `aliases`), one orphan.
2. `contentbit links content/**/*.md` → prints summary, writes
   `.contentbit/link-index.json`; exits 1 due to the dangling link; orphan
   shows as a warning.
3. Inspect `link-index.json`: `linkedFrom` correctly derived; alias resolved in
   the referencing page's `linksTo`.
4. Fix the dangling link; `contentbit links --fix` rewrites the alias reference
   to the current slug in source; re-run → exits 0.
5. `contentbit validate content/**/*.md` → link checks run automatically and
   pass.
```
