# Internal Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frontmatter-authored internal-link graph to contentbit, with a generated index, derived backlinks, broken-link validation through `contentbit validate`, and rename-healing via per-page aliases.

**Implementation status:** Complete on `feat/internal-linking`. Public usage docs live in `site/content/docs/guides/internal-linking.mdx`; generated `contentbit agents` instructions now include the link-index workflow.

**Architecture:** Authored link data (`slug`, `linksTo`, `aliases`, `keywords`) lives in each file's YAML frontmatter. A pure index-builder reads only frontmatter, resolves aliases, and derives `linkedFrom`. A `validateLinks` function emits `CB_*` diagnostics for dangling/duplicate/orphan links. A new `contentbit links` command builds/writes `.contentbit/link-index.json` and the existing `validate` command runs the cross-file link check automatically when link data is present. One supporting change: the frontmatter parser gains one level of nested-mapping support so `keywords.primary/secondary` parses.

**Tech Stack:** TypeScript (NodeNext ESM, `.js` import specifiers), Zod 4, Vitest, tinyglobby, `node:util` parseArgs. Monorepo packages `@contentbit/core` and `contentbit` (CLI).

---

## File Structure

**Modify:**
- `packages/core/src/frontmatter.ts` — add one-level nested-mapping parsing in `parseValue`.
- `packages/core/src/frontmatter.test.ts` — tests for nested mapping.
- `packages/core/src/index.ts` — export the new links API.
- `packages/cli/src/run.ts` — register the `links` command + update `USAGE`.
- `packages/cli/src/commands/validate.ts` — run link validation across the matched file set when link data is present.

**Create:**
- `packages/core/src/links.ts` — schema, types, index builder, link validation (one focused module; the links domain is small and these pieces change together).
- `packages/core/src/links.test.ts` — unit tests for the builder + validator.
- `packages/cli/src/commands/links.ts` — the `links` command.
- `packages/cli/src/commands/links.test.ts` — CLI tests for `links` + `links --fix`.
- `packages/cli/src/commands/validate.test.ts` — (append) tests for auto link checks in `validate`.

---

## Task 1: Frontmatter parser — one level of nested mapping

**Files:**
- Modify: `packages/core/src/frontmatter.ts` (function `parseValue`, lines 78-88)
- Test: `packages/core/src/frontmatter.test.ts`

Currently `parseValue` handles block scalars, dash-lists, and (for an empty value with indented lines that aren't a dash list) joins them as raw text. We add: when the indented lines look like `key: value` mapping entries, parse them into an object (reusing `parseScalar`/`parseValue` semantics for each entry's value). Anything deeper than one level keeps falling back to raw text.

- [ ] **Step 1: Write the failing tests**

Append to `packages/core/src/frontmatter.test.ts`:

```ts
test('parses a one-level nested mapping into an object', () => {
  const fm = extractFrontmatter(
    '---\nkeywords:\n  primary: how to make pizza dough\n  secondary: [easy dough, homemade dough]\n---\nBody\n',
  )
  expect(fm?.data.keywords).toEqual({
    primary: 'how to make pizza dough',
    secondary: ['easy dough', 'homemade dough'],
  })
})

test('nested mapping coexists with flat keys and dash lists', () => {
  const fm = extractFrontmatter(
    '---\nslug: a\nlinksTo:\n  - b\n  - c\nkeywords:\n  primary: x\n---\nBody\n',
  )
  expect(fm?.data.slug).toBe('a')
  expect(fm?.data.linksTo).toEqual(['b', 'c'])
  expect(fm?.data.keywords).toEqual({ primary: 'x' })
})

test('mappings deeper than one level fall back to raw text', () => {
  const fm = extractFrontmatter('---\nouter:\n  inner:\n    deep: x\n---\nBody\n')
  expect(typeof fm?.data.outer).toBe('string')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @contentbit/core exec vitest run frontmatter`
Expected: the three new tests FAIL (`keywords` comes back as a string, not an object).

- [ ] **Step 3: Implement nested-mapping parsing**

In `packages/core/src/frontmatter.ts`, replace the `parseValue` function (lines 78-88) with:

```ts
function parseValue(value: string, indented: string[]): unknown {
  if (/^[|>][+-]?$/.test(value)) return dedent(indented).join('\n')
  if (value === '') {
    if (indented.length === 0) return null
    const items = dedent(indented)
    if (items.every((l) => l.startsWith('- ')))
      return items.map((l) => parseScalar(l.slice(2).trim()))
    const mapping = parseNestedMapping(items)
    if (mapping) return mapping
    return items.join('\n')
  }
  return parseScalar(value)
}

// A one-level mapping: every dedented line is `key: scalar` (or `key:` with an
// inline array). Returns null if any line isn't a flat mapping entry — e.g. a
// deeper nested block — so the caller keeps the raw-text fallback.
function parseNestedMapping(items: string[]): Record<string, unknown> | null {
  const out: Record<string, unknown> = {}
  for (const line of items) {
    if (/^[ \t]/.test(line)) return null // a deeper-indented line: not one level
    const m = line.match(KEY_RE)
    if (!m) return null
    const [, key, rawValue] = m
    const v = rawValue.trim()
    if (v === '') return null // would need its own nested block: too deep
    out[key] = parseScalar(v)
  }
  return Object.keys(out).length > 0 ? out : null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @contentbit/core exec vitest run frontmatter`
Expected: all frontmatter tests PASS (new ones plus every pre-existing test).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/frontmatter.ts packages/core/src/frontmatter.test.ts
git commit -m "feat(core): parse one-level nested frontmatter mappings"
```

---

## Task 2: Links module — schema and types

**Files:**
- Create: `packages/core/src/links.ts`
- Test: `packages/core/src/links.test.ts`

Define the authored-frontmatter Zod schema and the index types. The schema is lenient about absence and strict about shape; `parseLinkFrontmatter` returns either parsed data or a list of shape errors (so callers can turn them into diagnostics without throwing).

- [ ] **Step 1: Write the failing test**

Create `packages/core/src/links.test.ts`:

```ts
import { expect, test } from 'vitest'

import { parseLinkFrontmatter } from './links.js'

test('parses a full authored link frontmatter', () => {
  const r = parseLinkFrontmatter({
    slug: 'beginner-pizza-dough',
    linksTo: ['cold-fermentation-pizza'],
    aliases: ['intro-pizza-dough'],
    keywords: { primary: 'how to make pizza dough', secondary: ['easy dough'] },
    title: 'Beginner Pizza Dough',
  })
  expect(r.ok).toBe(true)
  if (r.ok) {
    expect(r.value.slug).toBe('beginner-pizza-dough')
    expect(r.value.linksTo).toEqual(['cold-fermentation-pizza'])
  }
})

test('a file with no slug is a non-participating page', () => {
  const r = parseLinkFrontmatter({ title: 'Just prose' })
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.value).toBeNull()
})

test('rejects a non-array linksTo', () => {
  const r = parseLinkFrontmatter({ slug: 'a', linksTo: 'b' })
  expect(r.ok).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @contentbit/core exec vitest run links`
Expected: FAIL — `Cannot find module './links.js'`.

- [ ] **Step 3: Implement the schema and parser**

Create `packages/core/src/links.ts`:

```ts
import { z } from 'zod'

const Keywords = z.object({
  primary: z.string().optional(),
  secondary: z.array(z.string()).optional(),
})

const LinkFrontmatter = z.object({
  slug: z.string().min(1),
  title: z.string().optional(),
  linksTo: z.array(z.string()).optional(),
  aliases: z.array(z.string()).optional(),
  keywords: Keywords.optional(),
})

export type LinkFrontmatter = z.infer<typeof LinkFrontmatter>

export type ParseLinkResult =
  | { ok: true; value: LinkFrontmatter | null }
  | { ok: false; errors: string[] }

// Returns { value: null } when there is no `slug` (a non-participating page),
// parsed data when the link shape is valid, or shape errors otherwise. Never
// throws — callers turn errors into diagnostics.
export function parseLinkFrontmatter(data: Record<string, unknown>): ParseLinkResult {
  if (!('slug' in data)) return { ok: true, value: null }
  const parsed = LinkFrontmatter.safeParse(data)
  if (parsed.success) return { ok: true, value: parsed.data }
  return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @contentbit/core exec vitest run links`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/links.ts packages/core/src/links.test.ts
git commit -m "feat(core): add link frontmatter schema and parser"
```

---

## Task 3: Links module — index builder

**Files:**
- Modify: `packages/core/src/links.ts`
- Test: `packages/core/src/links.test.ts`

A pure builder: input is a list of `{ path, data }` (raw frontmatter data per file); output is a `LinkIndex` with aliases resolved in `linksTo` and `linkedFrom` derived. No I/O. Files whose frontmatter has no `slug` are skipped. Shape-invalid files are skipped here (validation surfaces their errors in Task 4 / the CLI), so the builder stays total.

- [ ] **Step 1: Write the failing test**

Append to `packages/core/src/links.test.ts`:

```ts
import { buildLinkIndex } from './links.js'

test('derives linkedFrom and resolves aliases in linksTo', () => {
  const index = buildLinkIndex([
    { path: 'a.md', data: { slug: 'a', linksTo: ['old-b'] } },
    { path: 'b.md', data: { slug: 'b', aliases: ['old-b'], linksTo: ['a'] } },
  ])
  const a = index.pages.get('a')
  const b = index.pages.get('b')
  expect(a?.linksTo).toEqual(['b']) // old-b resolved to current slug b
  expect(b?.linkedFrom).toEqual(['a'])
  expect(a?.linkedFrom).toEqual(['b'])
  expect(index.aliases.get('old-b')).toBe('b')
})

test('skips files without a slug', () => {
  const index = buildLinkIndex([{ path: 'x.md', data: { title: 'no slug' } }])
  expect(index.pages.size).toBe(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @contentbit/core exec vitest run links`
Expected: FAIL — `buildLinkIndex` is not exported.

- [ ] **Step 3: Implement the builder**

Append to `packages/core/src/links.ts`:

```ts
export interface IndexedPage {
  slug: string
  path: string
  title?: string
  keywords?: { primary?: string; secondary?: string[] }
  linksTo: string[]
  linkedFrom: string[]
  aliases: string[]
}

export interface LinkIndex {
  pages: Map<string, IndexedPage>
  aliases: Map<string, string>
}

export interface LinkInput {
  path: string
  data: Record<string, unknown>
}

// Pure: builds the resolved link graph from per-file frontmatter data. Pass 1
// collects pages and registers aliases; pass 2 resolves each linksTo through
// the alias map and inverts edges to derive linkedFrom. Files with no slug or
// invalid shape are skipped so the builder never throws.
export function buildLinkIndex(inputs: LinkInput[]): LinkIndex {
  const pages = new Map<string, IndexedPage>()
  const aliases = new Map<string, string>()

  for (const { path, data } of inputs) {
    const parsed = parseLinkFrontmatter(data)
    if (!parsed.ok || parsed.value === null) continue
    const fm = parsed.value
    pages.set(fm.slug, {
      slug: fm.slug,
      path,
      title: fm.title,
      keywords: fm.keywords,
      linksTo: fm.linksTo ?? [],
      linkedFrom: [],
      aliases: fm.aliases ?? [],
    })
    for (const alias of fm.aliases ?? []) aliases.set(alias, fm.slug)
  }

  for (const page of pages.values()) {
    page.linksTo = page.linksTo.map((target) => aliases.get(target) ?? target)
    for (const target of page.linksTo) {
      const dest = pages.get(target)
      if (dest && !dest.linkedFrom.includes(page.slug)) dest.linkedFrom.push(page.slug)
    }
  }
  return { pages, aliases }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @contentbit/core exec vitest run links`
Expected: PASS (all links tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/links.ts packages/core/src/links.test.ts
git commit -m "feat(core): build link index with derived backlinks and alias resolution"
```

---

## Task 4: Links module — link validation

**Files:**
- Modify: `packages/core/src/links.ts`
- Test: `packages/core/src/links.test.ts`

`validateLinks(inputs)` parses each file, builds the index, and emits `Diagnostic`s. Link diagnostics are file-level and cross-file, so each one carries the file path (via `blockName` reuse is wrong here — instead we attach the path on a `file` field is not in Diagnostic). To stay within the existing `Diagnostic` shape, we return `Array<{ file: string; diagnostic: Diagnostic }>` so the CLI can format with the right filename. Position points at frontmatter line 1.

- [ ] **Step 1: Write the failing test**

Append to `packages/core/src/links.test.ts`:

```ts
import { validateLinks } from './links.js'

function codes(rows: { diagnostic: { code: string } }[]): string[] {
  return rows.map((r) => r.diagnostic.code).sort()
}

test('errors on a dangling linksTo with a did-you-mean hint', () => {
  const rows = validateLinks([
    { path: 'a.md', data: { slug: 'a', linksTo: ['beginer'] } },
    { path: 'b.md', data: { slug: 'beginner' } },
  ])
  const unresolved = rows.find((r) => r.diagnostic.code === 'CB_LINK_UNRESOLVED')
  expect(unresolved).toBeTruthy()
  expect(unresolved?.diagnostic.severity).toBe('error')
  expect(unresolved?.diagnostic.hint).toContain('beginner')
})

test('errors on duplicate slugs', () => {
  const rows = validateLinks([
    { path: 'a.md', data: { slug: 'dup' } },
    { path: 'b.md', data: { slug: 'dup' } },
  ])
  expect(codes(rows)).toContain('CB_SLUG_DUPLICATE')
})

test('warns on orphan and self-link', () => {
  const rows = validateLinks([{ path: 'a.md', data: { slug: 'a', linksTo: ['a'] } }])
  expect(codes(rows)).toContain('CB_LINK_SELF')
  // 'a' links only to itself; nobody else links to it => orphan
  expect(codes(rows)).toContain('CB_LINK_ORPHAN')
})

test('reports shape errors as CB_LINK_SHAPE', () => {
  const rows = validateLinks([{ path: 'a.md', data: { slug: 'a', linksTo: 'b' } }])
  expect(codes(rows)).toContain('CB_LINK_SHAPE')
})

test('a valid symmetric graph produces no errors', () => {
  const rows = validateLinks([
    { path: 'a.md', data: { slug: 'a', linksTo: ['b'] } },
    { path: 'b.md', data: { slug: 'b', linksTo: ['a'] } },
  ])
  expect(rows.filter((r) => r.diagnostic.severity === 'error')).toEqual([])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @contentbit/core exec vitest run links`
Expected: FAIL — `validateLinks` not exported.

- [ ] **Step 3: Implement validation**

Append to `packages/core/src/links.ts` (add the `Diagnostic` import at the top of the file alongside the zod import):

```ts
import type { Diagnostic, SourceRange } from './diagnostics.js'
```

```ts
export interface LinkDiagnostic {
  file: string
  diagnostic: Diagnostic
}

const FM_POSITION: SourceRange = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
}

function diag(
  file: string,
  code: string,
  severity: Diagnostic['severity'],
  message: string,
  hint?: string,
): LinkDiagnostic {
  return { file, diagnostic: { code, severity, message, hint, position: FM_POSITION } }
}

// Levenshtein distance for did-you-mean hints. Small inputs (slugs), so the
// simple O(n*m) matrix is fine.
function closest(target: string, candidates: string[]): string | undefined {
  let best: string | undefined
  let bestD = Infinity
  for (const c of candidates) {
    const d = editDistance(target, c)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best && bestD <= Math.max(2, Math.floor(target.length / 3)) ? best : undefined
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

// Cross-file link validation. Emits shape errors, duplicate-slug and
// alias-conflict errors, dangling-link errors (with did-you-mean), and
// self-link / orphan warnings. Returns file-tagged diagnostics so the CLI can
// format each with its own filename.
export function validateLinks(inputs: LinkInput[]): LinkDiagnostic[] {
  const out: LinkDiagnostic[] = []
  const seenSlug = new Map<string, string>() // slug -> first file
  const seenAlias = new Map<string, string>() // alias -> file

  // Shape + duplicate/alias-conflict pass (operates on raw inputs).
  for (const { path, data } of inputs) {
    const parsed = parseLinkFrontmatter(data)
    if (!parsed.ok) {
      for (const e of parsed.errors)
        out.push(diag(path, 'CB_LINK_SHAPE', 'error', `invalid link frontmatter: ${e}`))
      continue
    }
    if (parsed.value === null) continue
    const fm = parsed.value
    const prior = seenSlug.get(fm.slug)
    if (prior) out.push(diag(path, 'CB_SLUG_DUPLICATE', 'error', `slug "${fm.slug}" also used by ${prior}`))
    else seenSlug.set(fm.slug, path)
    for (const alias of fm.aliases ?? []) {
      if (seenAlias.has(alias))
        out.push(diag(path, 'CB_ALIAS_CONFLICT', 'error', `alias "${alias}" already declared by ${seenAlias.get(alias)}`))
      else seenAlias.set(alias, path)
    }
  }

  const index = buildLinkIndex(inputs)
  const slugs = [...index.pages.keys()]

  for (const page of index.pages.values()) {
    // alias colliding with a real slug
    for (const alias of page.aliases) {
      if (index.pages.has(alias))
        out.push(diag(page.path, 'CB_ALIAS_CONFLICT', 'error', `alias "${alias}" collides with an existing slug`))
    }
    for (const target of page.linksTo) {
      if (target === page.slug) {
        out.push(diag(page.path, 'CB_LINK_SELF', 'warning', `page "${page.slug}" links to itself`))
        continue
      }
      if (!index.pages.has(target)) {
        const hint = closest(target, slugs)
        out.push(
          diag(
            page.path,
            'CB_LINK_UNRESOLVED',
            'error',
            `linksTo "${target}" does not resolve to any page`,
            hint ? `Did you mean "${hint}"?` : undefined,
          ),
        )
      }
    }
    if (page.linkedFrom.length === 0)
      out.push(diag(page.path, 'CB_LINK_ORPHAN', 'warning', `page "${page.slug}" has no inbound links`))
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @contentbit/core exec vitest run links`
Expected: PASS (all links tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/links.ts packages/core/src/links.test.ts
git commit -m "feat(core): validate link graph with CB_LINK_* diagnostics"
```

---

## Task 5: Export the links API from core

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Add the export**

Append to `packages/core/src/index.ts`:

```ts
export {
  parseLinkFrontmatter,
  buildLinkIndex,
  validateLinks,
  type LinkFrontmatter,
  type ParseLinkResult,
  type IndexedPage,
  type LinkIndex,
  type LinkInput,
  type LinkDiagnostic,
} from './links.js'
```

- [ ] **Step 2: Verify the package type-checks and tests pass**

Run: `pnpm --filter @contentbit/core build && pnpm --filter @contentbit/core test`
Expected: build succeeds (no TS errors), all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): export internal-linking API"
```

---

## Task 6: Serialize the index to JSON

**Files:**
- Modify: `packages/core/src/links.ts`
- Test: `packages/core/src/links.test.ts`

`LinkIndex` uses `Map`s, which don't `JSON.stringify` usefully. Add `serializeLinkIndex` returning a plain, stable, sorted object — what `.contentbit/link-index.json` holds.

- [ ] **Step 1: Write the failing test**

Append to `packages/core/src/links.test.ts`:

```ts
import { serializeLinkIndex } from './links.js'

test('serializes to a stable sorted plain object', () => {
  const index = buildLinkIndex([
    { path: 'b.md', data: { slug: 'b', linksTo: ['a'] } },
    { path: 'a.md', data: { slug: 'a' } },
  ])
  const json = serializeLinkIndex(index)
  expect(json.pages.map((p) => p.slug)).toEqual(['a', 'b']) // sorted
  expect(json.pages[0].linkedFrom).toEqual(['b'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @contentbit/core exec vitest run links`
Expected: FAIL — `serializeLinkIndex` not exported.

- [ ] **Step 3: Implement serialization**

Append to `packages/core/src/links.ts`:

```ts
export interface SerializedLinkIndex {
  pages: IndexedPage[]
  aliases: Record<string, string>
}

// Stable, sorted JSON form for .contentbit/link-index.json. Sorting by slug
// (and sorting linkedFrom) keeps the artifact diff-friendly across runs.
export function serializeLinkIndex(index: LinkIndex): SerializedLinkIndex {
  const pages = [...index.pages.values()]
    .map((p) => ({ ...p, linkedFrom: [...p.linkedFrom].sort() }))
    .sort((a, b) => a.slug.localeCompare(b.slug))
  const aliases: Record<string, string> = {}
  for (const key of [...index.aliases.keys()].sort()) aliases[key] = index.aliases.get(key)!
  return { pages, aliases }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @contentbit/core exec vitest run links`
Expected: PASS.

- [ ] **Step 5: Add `serializeLinkIndex` to the core export**

In `packages/core/src/index.ts`, replace the links export block added in Task 5 with this complete block (adds `serializeLinkIndex` and `SerializedLinkIndex`):

```ts
export {
  parseLinkFrontmatter,
  buildLinkIndex,
  validateLinks,
  serializeLinkIndex,
  type LinkFrontmatter,
  type ParseLinkResult,
  type IndexedPage,
  type LinkIndex,
  type LinkInput,
  type LinkDiagnostic,
  type SerializedLinkIndex,
} from './links.js'
```

- [ ] **Step 6: Build, test, commit**

Run: `pnpm --filter @contentbit/core build && pnpm --filter @contentbit/core test`
Expected: PASS.

```bash
git add packages/core/src/links.ts packages/core/src/links.test.ts packages/core/src/index.ts
git commit -m "feat(core): serialize link index to stable sorted JSON"
```

---

## Task 7: Shared CLI helper — collect link inputs from files

**Files:**
- Create: `packages/cli/src/links-io.ts`
- Test: covered via command tests (Tasks 8-9)

Both `links` and `validate` need to turn a glob of files into `LinkInput[]` (read each file, extract frontmatter, keep `{ path, data }`). Factor it once.

- [ ] **Step 1: Implement the helper**

Create `packages/cli/src/links-io.ts`:

```ts
import { extractFrontmatter, type LinkInput } from '@contentbit/core'
import { readFile } from 'node:fs/promises'

// Read each file's frontmatter (head only — bodies are never parsed) into the
// LinkInput shape the core link functions consume. Files with no frontmatter
// contribute an empty data object (a non-participating page).
export async function collectLinkInputs(files: string[]): Promise<LinkInput[]> {
  const inputs: LinkInput[] = []
  for (const path of files) {
    const source = await readFile(path, 'utf8')
    const fm = extractFrontmatter(source)
    inputs.push({ path, data: fm?.data ?? {} })
  }
  return inputs
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter contentbit exec tsc -p tsconfig.build.json --noEmit`
Expected: no errors (note: `@contentbit/core` must be built first — run `pnpm --filter @contentbit/core build` if it complains about missing types).

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/links-io.ts
git commit -m "feat(cli): add helper to collect link inputs from files"
```

---

## Task 8: `contentbit links` command (build + validate + write index)

**Files:**
- Create: `packages/cli/src/commands/links.ts`
- Modify: `packages/cli/src/run.ts`
- Test: `packages/cli/src/commands/links.test.ts`

Behavior: glob files → collect inputs → `validateLinks` (print diagnostics) → build + serialize index → write `.contentbit/link-index.json` via `io.writeFile` → print summary. Exit 1 on link errors, 2 on bad args, else 0. (`--fix` is added in Task 9.)

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/commands/links.test.ts`:

```ts
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-links-'))
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf8')
  }
  return dir
}

test('builds an index and exits 0 for a valid graph', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - b\n---\nA\n',
    'b.md': '---\nslug: b\nlinksTo:\n  - a\n---\nB\n',
  })
  const io = fakeIo()
  expect(await run(['links', join(dir, '*.md')], io)).toBe(0)
  expect(io.out.join('\n')).toContain('2 page(s)')
})

test('exits 1 and reports a dangling link', async () => {
  const dir = await fixture({ 'a.md': '---\nslug: a\nlinksTo:\n  - nope\n---\nA\n' })
  const io = fakeIo()
  expect(await run(['links', join(dir, '*.md')], io)).toBe(1)
  expect(io.err.join('\n')).toContain('CB_LINK_UNRESOLVED')
})

test('writes the index json through io.writeFile', async () => {
  const dir = await fixture({ 'a.md': '---\nslug: a\nlinksTo:\n  - b\n---\nA\n', 'b.md': '---\nslug: b\nlinksTo:\n  - a\n---\nB\n' })
  const writes: Record<string, string> = {}
  const io = { ...fakeIo(), writeFile: async (p: string, c: string) => void (writes[p] = c) }
  await run(['links', join(dir, '*.md')], io)
  const path = Object.keys(writes).find((p) => p.endsWith('link-index.json'))!
  expect(path).toBeTruthy()
  const parsed = JSON.parse(writes[path])
  expect(parsed.pages.map((p: { slug: string }) => p.slug).sort()).toEqual(['a', 'b'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter contentbit exec vitest run links`
Expected: FAIL — unknown command `links` (run returns 2) / module missing.

- [ ] **Step 3: Implement the command**

Create `packages/cli/src/commands/links.ts`:

```ts
import { buildLinkIndex, formatDiagnostic, serializeLinkIndex, validateLinks } from '@contentbit/core'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { glob } from 'tinyglobby'

import type { Io } from '../run.js'

import { collectLinkInputs } from '../links-io.js'

export async function linksCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      fix: { type: 'boolean', default: false },
    },
  })
  if (positionals.length === 0) {
    io.stderr('links: provide at least one file or glob.')
    return 2
  }
  const files = (await glob(positionals, { absolute: true })).sort()
  if (files.length === 0) {
    io.stderr(`links: no files matched ${positionals.join(' ')}`)
    return 2
  }

  const inputs = await collectLinkInputs(files)

  let errors = 0
  let warnings = 0
  for (const { file, diagnostic } of validateLinks(inputs)) {
    io.stderr(formatDiagnostic(diagnostic, file))
    if (diagnostic.severity === 'error') errors++
    else if (diagnostic.severity === 'warning') warnings++
  }

  const index = buildLinkIndex(inputs)
  const outPath = values.out ?? join(process.cwd(), '.contentbit', 'link-index.json')
  await io.writeFile(outPath, JSON.stringify(serializeLinkIndex(index), null, 2) + '\n')

  let edges = 0
  for (const p of index.pages.values()) edges += p.linksTo.length
  const orphans = [...index.pages.values()].filter((p) => p.linkedFrom.length === 0).length
  io.stdout(`${index.pages.size} page(s), ${edges} link(s), ${orphans} orphan(s): ${errors} errors, ${warnings} warnings`)
  io.stdout(`index written to ${outPath}`)
  return errors > 0 ? 1 : 0
}
```

- [ ] **Step 4: Register the command**

In `packages/cli/src/run.ts`, add to the `commands` map (after `agents`):

```ts
  links: async () => (await import('./commands/links.js')).linksCommand,
```

And update `USAGE`. Replace the entire `USAGE` constant (run.ts lines 7-16) with this exact value — it adds the `links` line and moves the closing backtick to it:

```ts
export const USAGE = `Usage: contentbit <init|validate|stats|render|instructions|docs|agents|links> [options]

  init [-t react|html|markdown|astro] [--md ...] [-y] [--no-install] [--no-page] [--no-agents]
  agents [--claude] [--no-agents-md]

  validate <globs...> [--registry <module.mjs>] [--strict-warnings]
  stats <globs...> [--registry <module.mjs>] [--no-validate]
  render <file> --target html|markdown [--registry <module.mjs>] [--out <file>]
  instructions [--audience llm|human] [--no-examples] [--registry <module.mjs>] [--out <file>]
  docs [--registry <module.mjs>] [--out <file>]
  links <globs...> [--fix] [--out <file>]`
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @contentbit/core build && pnpm --filter contentbit exec vitest run links`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/links.ts packages/cli/src/commands/links.test.ts packages/cli/src/run.ts
git commit -m "feat(cli): add contentbit links command"
```

---

## Task 9: `contentbit links --fix` (alias rewrite in source)

**Files:**
- Modify: `packages/cli/src/commands/links.ts`
- Test: `packages/cli/src/commands/links.test.ts`

`--fix` rewrites `linksTo` entries that point at a **known alias** to the current slug, in the source frontmatter. It only ever does alias→current substitution — never invents/removes/reorders links, never writes `linkedFrom`. Implemented as a literal token replacement of the alias inside the frontmatter region so unrelated formatting is preserved.

- [ ] **Step 1: Write the failing test**

Append to `packages/cli/src/commands/links.test.ts`:

```ts
test('--fix rewrites alias references to the current slug in source', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - old-b\n---\nA\n',
    'b.md': '---\nslug: b\naliases:\n  - old-b\nlinksTo:\n  - a\n---\nB\n',
  })
  const writes: Record<string, string> = {}
  const io = { ...fakeIo(), writeFile: async (p: string, c: string) => void (writes[p] = c) }
  expect(await run(['links', join(dir, '*.md'), '--fix'], io)).toBe(0)
  const aWrite = Object.entries(writes).find(([p]) => p.endsWith('a.md'))
  expect(aWrite).toBeTruthy()
  expect(aWrite![1]).toContain('- b')
  expect(aWrite![1]).not.toContain('old-b')
})

test('--fix leaves files without alias references untouched (no write)', async () => {
  const dir = await fixture({ 'a.md': '---\nslug: a\nlinksTo:\n  - b\n---\nA\n', 'b.md': '---\nslug: b\nlinksTo:\n  - a\n---\nB\n' })
  const writes: Record<string, string> = {}
  const io = { ...fakeIo(), writeFile: async (p: string, c: string) => void (writes[p] = c) }
  await run(['links', join(dir, '*.md'), '--fix'], io)
  expect(Object.keys(writes).some((p) => p.endsWith('a.md') || p.endsWith('b.md'))).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter contentbit exec vitest run links`
Expected: FAIL — `--fix` doesn't rewrite source yet (first test fails; the index is still written but a.md isn't).

- [ ] **Step 3: Implement the fix pass**

In `packages/cli/src/commands/links.ts`, add this import:

```ts
import { extractFrontmatter } from '@contentbit/core'
import { readFile } from 'node:fs/promises'
```

Then, after building `index` and before writing the index file, insert the fix pass:

```ts
  if (values.fix && index.aliases.size > 0) {
    for (const file of files) {
      const source = await readFile(file, 'utf8')
      const fm = extractFrontmatter(source)
      if (!fm) continue
      const fmEnd = fm.lines.end // 1-based last fence line
      const lines = source.split('\n')
      let changed = false
      for (let i = 0; i < fmEnd && i < lines.length; i++) {
        for (const [alias, current] of index.aliases) {
          // Replace a whole-token alias occurrence (list item or inline) within
          // the frontmatter region only. Word boundaries avoid partial hits.
          const re = new RegExp(`(^|[\\s\\[,'"-])${escapeRe(alias)}($|[\\s\\],'"])`, 'g')
          const next = lines[i].replace(re, (_m, p1, p2) => `${p1}${current}${p2}`)
          if (next !== lines[i]) {
            lines[i] = next
            changed = true
          }
        }
      }
      if (changed) await io.writeFile(file, lines.join('\n'))
    }
  }
```

And add this helper at the bottom of the file:

```ts
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @contentbit/core build && pnpm --filter contentbit exec vitest run links`
Expected: PASS (all links tests, including the two `--fix` tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/links.ts packages/cli/src/commands/links.test.ts
git commit -m "feat(cli): add links --fix to rewrite alias references to current slugs"
```

---

## Task 10: Auto-run link checks inside `contentbit validate`

**Files:**
- Modify: `packages/cli/src/commands/validate.ts`
- Test: `packages/cli/src/commands/validate.test.ts`

After per-document validation, run `validateLinks` once across the matched file set. Only emit link diagnostics when at least one file declares link data (a `slug`), so projects not using linking are unaffected. Merge link errors/warnings into the existing counts and exit logic.

- [ ] **Step 1: Write the failing test**

Append to `packages/cli/src/commands/validate.test.ts`:

```ts
test('validate fails on a dangling internal link', async () => {
  const dir = await fixture({
    'a.md': '---\nslug: a\nlinksTo:\n  - missing\n---\n\nProse.\n',
  })
  const io = fakeIo()
  expect(await run(['validate', join(dir, '*.md')], io)).toBe(1)
  expect(io.err.join('\n')).toContain('CB_LINK_UNRESOLVED')
})

test('validate ignores link checks when no file declares a slug', async () => {
  const dir = await fixture({ 'a.md': '---\ntitle: just prose\n---\n\nProse.\n' })
  const io = fakeIo()
  expect(await run(['validate', join(dir, '*.md')], io)).toBe(0)
  expect(io.err.join('\n')).not.toContain('CB_LINK')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter contentbit exec vitest run validate`
Expected: FAIL — `validate` doesn't run link checks yet (first test returns 0, not 1).

- [ ] **Step 3: Implement the cross-file link pass**

In `packages/cli/src/commands/validate.ts`:

Add to the imports from `@contentbit/core`: `extractFrontmatter`, `validateLinks`. Add the helper import:

```ts
import { collectLinkInputs } from '../links-io.js'
```

The per-file loop already reads `source`. Collect inputs alongside it instead of re-reading. Change the loop to also gather link inputs, then after the loop add the link pass. Replace the loop body region (lines ~37-48) and the summary so it reads:

```ts
  const linkInputs: { path: string; data: Record<string, unknown> }[] = []
  for (const file of files.sort()) {
    const source = await readFile(file, 'utf8')
    const fm = extractFrontmatter(source)
    linkInputs.push({ path: file, data: fm?.data ?? {} })
    const result = validateDocument(parseDocument(stripFrontmatter(source)), registry)
    for (const d of result.diagnostics) {
      io.stderr(formatDiagnostic(d, file))
      if (d.severity === 'error') errors++
      else if (d.severity === 'warning') warnings++
    }
  }

  // Cross-file internal-link checks, only when the project uses linking.
  const usesLinks = linkInputs.some((i) => 'slug' in i.data)
  if (usesLinks) {
    for (const { file, diagnostic } of validateLinks(linkInputs)) {
      io.stderr(formatDiagnostic(diagnostic, file))
      if (diagnostic.severity === 'error') errors++
      else if (diagnostic.severity === 'warning') warnings++
    }
  }
```

(Note: `collectLinkInputs` is the reusable helper, but here we already hold `source`, so we extract frontmatter inline to avoid reading each file twice. The import of `collectLinkInputs` is therefore NOT needed in validate.ts — remove it if added. Keep only `extractFrontmatter` and `validateLinks` added to the core import.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @contentbit/core build && pnpm --filter contentbit exec vitest run validate`
Expected: PASS (both new tests plus all existing validate tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/validate.ts packages/cli/src/commands/validate.test.ts
git commit -m "feat(cli): run internal-link checks during validate when link data is present"
```

---

## Task 11: Full build + test sweep and end-to-end check

**Files:** none (verification only)

- [ ] **Step 1: Full monorepo build and test**

Run: `pnpm -r build && pnpm -r test`
Expected: every package builds and all tests PASS.

- [ ] **Step 2: Lint and format check**

Run: `pnpm lint && pnpm fmt:check`
Expected: no lint errors; formatting clean. (If `fmt:check` flags the new files, run `pnpm fmt` and amend.)

- [ ] **Step 3: Manual end-to-end on a throwaway fixture**

```bash
TMP=$(mktemp -d)
printf -- '---\nslug: beginner\nlinksTo:\n  - intro-advanced\n---\nBeginner.\n' > "$TMP/beginner.md"
printf -- '---\nslug: advanced\naliases:\n  - intro-advanced\nlinksTo:\n  - beginner\n---\nAdvanced.\n' > "$TMP/advanced.md"
printf -- '---\nslug: lonely\nlinksTo:\n  - typpo\n---\nLonely.\n' > "$TMP/lonely.md"
node packages/cli/dist/bin.js links "$TMP/*.md"
```

Expected:
- Exit code 1 (the `typpo` dangling link is an error).
- stderr shows `CB_LINK_UNRESOLVED` with a `Did you mean "beginner"?`-style hint for `typpo`, and `CB_LINK_ORPHAN` warnings.
- `.contentbit/link-index.json` written; in it, `beginner.linksTo` is `["advanced"]` (alias `intro-advanced` resolved) and `advanced.linkedFrom` includes `beginner`.

- [ ] **Step 4: Verify `--fix` rewrites the alias in source**

```bash
node packages/cli/dist/bin.js links "$TMP/*.md" --fix
cat "$TMP/beginner.md"
```

Expected: `beginner.md`'s `linksTo` now lists `- advanced` (was `- intro-advanced`); the rest of the file is unchanged.

- [ ] **Step 5: Add a changeset**

```bash
pnpm changeset
```

Choose a **minor** bump for `@contentbit/core` and `contentbit`. Summary: "Internal linking: frontmatter-authored link graph, generated index with derived backlinks, link validation via `contentbit validate`, and `contentbit links` with `--fix` alias healing."

```bash
git add .changeset
git commit -m "chore: changeset for internal linking"
```

---

## Self-Review Notes

- **Spec coverage:** authored frontmatter shape → Tasks 2,1 (keywords nesting); index + derived backlinks → Task 3; serialized artifact → Task 6; all six `CB_LINK_*`/`CB_SLUG_DUPLICATE`/`CB_ALIAS_CONFLICT` diagnostics → Task 4; `links` command + `--out` + index write → Task 8; `--fix` alias healing → Task 9; auto-run in `validate` (zero-config) → Task 10; cross-file boundary kept in the CLI, core `validateDocument` untouched → Task 10. `CB_LINK_ASYMMETRY` from the spec is intentionally **deferred** (spec marked it "configurable; may default off if noisy") — not implemented in v1 to avoid warning noise; revisit if needed.
- **Type consistency:** `LinkInput { path, data }`, `IndexedPage`, `LinkIndex { pages, aliases }`, `LinkDiagnostic { file, diagnostic }`, `parseLinkFrontmatter`, `buildLinkIndex`, `validateLinks`, `serializeLinkIndex` are used identically across Tasks 2-10.
- **Renderer-agnostic:** no renderer packages touched; matches the "frontmatter only, no inline rendering" decision.
