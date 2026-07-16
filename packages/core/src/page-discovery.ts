import type { DocumentStats } from './analyze.js'
import type { LinkResolverOptions } from './links.js'
import {
  readContentPageFacts,
  type ContentPageKeywords,
  type ContentPageFacts,
} from './page-facts.js'

export type ContentPageFactSource = 'frontmatter' | 'config' | 'document' | 'path'
export type ContentPageFactConfidence = 'exact' | 'likely' | 'guess'

export interface DiscoveredContentPageFact<T> {
  value: T
  source: ContentPageFactSource
  confidence: ContentPageFactConfidence
}

/** Page facts resolved from the strongest information currently available.
 * Authored/configured values remain authoritative; document and path fallbacks
 * let read-only adoption understand a page before Contentbit is configured. */
export interface DiscoveredContentPageFacts {
  identity: DiscoveredContentPageFact<string>
  title: DiscoveredContentPageFact<string>
  slug: DiscoveredContentPageFact<string>
  key?: DiscoveredContentPageFact<string>
  locale?: DiscoveredContentPageFact<string>
  description?: DiscoveredContentPageFact<string>
  type?: DiscoveredContentPageFact<string>
  family?: DiscoveredContentPageFact<string>
  intent?: DiscoveredContentPageFact<string>
  keywords?: DiscoveredContentPageFact<ContentPageKeywords>
  linksTo?: DiscoveredContentPageFact<string[]>
}

export interface DiscoverContentPageFactsInput {
  path: string
  frontmatter: Record<string, unknown>
  stats: DocumentStats
}

/** Resolve one page through a small, provenance-aware interface.
 *
 * Project-level locale and family inference lives in `discoverContentProject`;
 * published URL observation can be added without teaching callers how
 * resolution works. */
export function discoverContentPageFacts(
  input: DiscoverContentPageFactsInput,
  options: LinkResolverOptions = {},
): DiscoveredContentPageFacts {
  const authored = readContentPageFacts(input.frontmatter, options)
  const key = stringFact(
    authored,
    'key',
    configuredSource(input.frontmatter, 'key', options.keyField),
  )
  const authoredSlug = stringFact(
    authored,
    'slug',
    configuredSource(input.frontmatter, 'slug', options.slugField),
  )
  const slug = authoredSlug ?? pathSlugFact(input.path)
  const title =
    stringFact(authored, 'title', 'frontmatter') ??
    headingTitleFact(input.stats) ??
    pathTitleFact(input.path)

  return {
    identity: key ?? authoredSlug ?? exactPathFact(input.path),
    title,
    slug,
    ...(key ? { key } : {}),
    ...optionalStringFact(authored, input.frontmatter, options, 'locale'),
    ...optionalStringFact(authored, input.frontmatter, options, 'description'),
    ...optionalStringFact(authored, input.frontmatter, options, 'type'),
    ...optionalStringFact(authored, input.frontmatter, options, 'intent'),
    ...(authored.keywords ? { keywords: exactFact(authored.keywords, 'frontmatter') } : {}),
    ...(authored.linksTo ? { linksTo: exactFact(authored.linksTo, 'frontmatter') } : {}),
  }
}

function optionalStringFact(
  facts: ContentPageFacts,
  frontmatter: Record<string, unknown>,
  options: LinkResolverOptions,
  field: 'locale' | 'description' | 'type' | 'intent',
): Partial<DiscoveredContentPageFacts> {
  const configured = field === 'locale' ? options.localeField : undefined
  const fact = stringFact(facts, field, configuredSource(frontmatter, field, configured))
  return fact ? { [field]: fact } : {}
}

function stringFact(
  facts: ContentPageFacts,
  field: 'key' | 'slug' | 'locale' | 'title' | 'description' | 'type' | 'intent',
  source: Extract<ContentPageFactSource, 'frontmatter' | 'config'>,
): DiscoveredContentPageFact<string> | undefined {
  const value = facts[field]
  return typeof value === 'string' ? exactFact(value, source) : undefined
}

function exactFact<T>(
  value: T,
  source: Extract<ContentPageFactSource, 'frontmatter' | 'config'>,
): DiscoveredContentPageFact<T> {
  return { value, source, confidence: 'exact' }
}

function exactPathFact(value: string): DiscoveredContentPageFact<string> {
  return { value, source: 'path', confidence: 'exact' }
}

function headingTitleFact(stats: DocumentStats): DiscoveredContentPageFact<string> | undefined {
  const heading = stats.outline.find((entry) => entry.level === 1)
  return heading ? { value: heading.text, source: 'document', confidence: 'likely' } : undefined
}

function pathSlugFact(path: string): DiscoveredContentPageFact<string> {
  return { value: slugFromPath(path), source: 'path', confidence: 'guess' }
}

function pathTitleFact(path: string): DiscoveredContentPageFact<string> {
  return { value: titleFromPath(path), source: 'path', confidence: 'guess' }
}

function configuredSource(
  frontmatter: Record<string, unknown>,
  canonical: string,
  configured: string | undefined,
): Extract<ContentPageFactSource, 'frontmatter' | 'config'> {
  if (!(canonical in frontmatter) && configured && configured in frontmatter) return 'config'
  return 'frontmatter'
}

function slugFromPath(path: string): string {
  return filenameFromPath(path)
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function titleFromPath(path: string): string {
  return filenameFromPath(path)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
}

function filenameFromPath(path: string): string {
  return path
    .slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
    .replace(/\.mdx?$/i, '')
}
