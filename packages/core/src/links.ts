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
