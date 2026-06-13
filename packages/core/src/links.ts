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
