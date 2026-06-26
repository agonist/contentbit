import type { LinkResolverOptions } from './links.js'

export interface ContentPageKeywords {
  primary?: string
  secondary?: string[]
  lsi?: string[]
}

export interface ContentPageFacts {
  slug?: string
  key?: string
  locale?: string
  title?: string
  description?: string
  type?: string
  intent?: string
  keywords?: ContentPageKeywords
  linksTo?: string[]
  frontmatter: Record<string, unknown>
}

export function normalizeContentPageFrontmatter(
  data: Record<string, unknown>,
  options: LinkResolverOptions = {},
): Record<string, unknown> {
  const out = { ...data }
  copyConfiguredField(out, data, options.slugField, 'slug')
  copyConfiguredField(out, data, options.keyField, 'key')
  copyConfiguredField(out, data, options.localeField, 'locale')
  copyFallbackField(out, data, 'seoKeywords', 'keywords')
  copyFallbackField(out, data, 'pageType', 'type')
  return out
}

export function readContentPageFacts(
  data: Record<string, unknown>,
  options: LinkResolverOptions = {},
): ContentPageFacts {
  const frontmatter = normalizeContentPageFrontmatter(data, options)
  const linksTo = stringArray(frontmatter.linksTo)
  return {
    ...(stringValue(frontmatter.slug) ? { slug: stringValue(frontmatter.slug) } : {}),
    ...(stringValue(frontmatter.key) ? { key: stringValue(frontmatter.key) } : {}),
    ...(stringValue(frontmatter.locale) ? { locale: stringValue(frontmatter.locale) } : {}),
    ...(stringValue(frontmatter.title) ? { title: stringValue(frontmatter.title) } : {}),
    ...(stringValue(frontmatter.description)
      ? { description: stringValue(frontmatter.description) }
      : {}),
    ...(stringValue(frontmatter.type) ? { type: stringValue(frontmatter.type) } : {}),
    ...(stringValue(frontmatter.intent) ? { intent: stringValue(frontmatter.intent) } : {}),
    ...(keywordsValue(frontmatter.keywords)
      ? { keywords: keywordsValue(frontmatter.keywords) }
      : {}),
    ...(linksTo ? { linksTo } : {}),
    frontmatter,
  }
}

export function contentPageIdentity(
  facts: Pick<ContentPageFacts, 'key' | 'slug'>,
  fallback: string,
): string {
  return facts.key ?? facts.slug ?? fallback
}

export function keywordsValue(value: unknown): ContentPageKeywords | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const primary = stringValue(record.primary)
  const secondary = stringArray(record.secondary)
  const lsi = stringArray(record.lsi)
  return primary || (secondary?.length ?? 0) > 0 || (lsi?.length ?? 0) > 0
    ? {
        ...(primary ? { primary } : {}),
        ...(secondary ? { secondary } : {}),
        ...(lsi ? { lsi } : {}),
      }
    : undefined
}

function copyConfiguredField(
  out: Record<string, unknown>,
  data: Record<string, unknown>,
  from: string | undefined,
  to: string,
): void {
  if (!from || from === to || !(from in data) || to in out) return
  out[to] = data[from]
}

function copyFallbackField(
  out: Record<string, unknown>,
  data: Record<string, unknown>,
  from: string,
  to: string,
): void {
  if (to in out || !(from in data)) return
  out[to] = data[from]
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined
}
