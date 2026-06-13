import { z } from 'zod'

import type { Diagnostic, SourceRange } from './diagnostics.js'

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
      // A self-link is not an inbound link: it must not populate linkedFrom,
      // or a page that only links to itself would never count as an orphan.
      if (target === page.slug) continue
      const dest = pages.get(target)
      if (dest && !dest.linkedFrom.includes(page.slug)) dest.linkedFrom.push(page.slug)
    }
  }
  return { pages, aliases }
}

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
    if (prior)
      out.push(diag(path, 'CB_SLUG_DUPLICATE', 'error', `slug "${fm.slug}" also used by ${prior}`))
    else seenSlug.set(fm.slug, path)
    for (const alias of fm.aliases ?? []) {
      if (seenAlias.has(alias))
        out.push(
          diag(
            path,
            'CB_ALIAS_CONFLICT',
            'error',
            `alias "${alias}" already declared by ${seenAlias.get(alias)}`,
          ),
        )
      else seenAlias.set(alias, path)
    }
  }

  const index = buildLinkIndex(inputs)
  const slugs = [...index.pages.keys()]

  for (const page of index.pages.values()) {
    // alias colliding with a real slug
    for (const alias of page.aliases) {
      if (index.pages.has(alias))
        out.push(
          diag(page.path, 'CB_ALIAS_CONFLICT', 'error', `alias "${alias}" collides with an existing slug`),
        )
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
