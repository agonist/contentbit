import type { DocumentStats } from './analyze.js'
import type { LinkResolverOptions } from './links.js'

import { readContentPageFacts, type ContentPageFacts } from './page-facts.js'
import { contentPageUrlResolver } from './page-routes.js'

export interface ContentIntegrityFile {
  path: string
  frontmatter: Record<string, unknown>
  stats: DocumentStats
}

interface IntegrityPage {
  file: ContentIntegrityFile
  facts: ContentPageFacts
}

interface RouteTable {
  pages: Map<string, ContentIntegrityFile>
  host: Set<string>
  /** Pages have the URLs `links.routes` gives them, rather than slug and key guesses. */
  configured: boolean
}

export interface ContentIntegrityFinding {
  severity: 'warning'
  code:
    | 'CB_H1_MISSING'
    | 'CB_H1_MULTIPLE'
    | 'CB_HEADING_LEVEL_SKIPPED'
    | 'CB_TITLE_DUPLICATE'
    | 'CB_DESCRIPTION_DUPLICATE'
    | 'CB_LOCALE_KEY_MISSING'
    | 'CB_LOCALE_KEY_INCOMPLETE'
    | 'CB_MARKDOWN_LINK_UNRESOLVED'
    | 'CB_MARKDOWN_ANCHOR_UNRESOLVED'
    | 'CB_INTERNAL_URL_UNRESOLVED'
  file: string
  line: number
  column: number
  message: string
  hint: string
}

/**
 * Content-quality checks that need to see more than one document. These stay
 * deliberately conservative: page-only requirements apply to slugged pages,
 * and Markdown links are checked only when they name a local Markdown file, an
 * in-document anchor, or a site route. A route must match a page URL from
 * `links.routes` when the project configures routes, and otherwise a scanned
 * page's slug or key. The site root, `links.hostRoutes`, and file assets remain
 * the host app's concern.
 */
export function scanContentIntegrity(
  files: ContentIntegrityFile[],
  options: LinkResolverOptions = {},
): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = []
  const pages = files.map((file) => ({
    file,
    facts: readContentPageFacts(file.frontmatter, options),
  }))
  const byPath = new Map(files.map((file) => [normalizePath(file.path), file]))
  const routes = routeTable(pages, options)

  const titles = new Map<string, string>()
  const descriptions = new Map<string, string>()
  for (const page of pages) {
    addDuplicateFinding(findings, titles, page, 'title', 'CB_TITLE_DUPLICATE')
    addDuplicateFinding(findings, descriptions, page, 'description', 'CB_DESCRIPTION_DUPLICATE')
    findings.push(...documentStructureFindings(page))
  }
  findings.push(...localeKeyFindings(pages, options))

  for (const file of files) {
    for (const link of file.stats.links.items) {
      const target = resolveContentLink(link.url, file.path, routes)
      if (!target) continue
      const destination = byPath.get(target.path)
      if (!destination) {
        const code =
          target.kind === 'route' ? 'CB_INTERNAL_URL_UNRESOLVED' : 'CB_MARKDOWN_LINK_UNRESOLVED'
        const label = target.kind === 'route' ? 'Internal URL' : 'Markdown link'
        findings.push({
          severity: 'warning',
          code,
          file: file.path,
          line: link.line,
          column: 1,
          message: `${label} "${link.url}" does not match a scanned content page`,
          hint: unresolvedLinkHint(target.kind, routes.configured),
        })
        continue
      }
      if (target.anchor && !headingAnchors(destination.stats).has(target.anchor)) {
        findings.push({
          severity: 'warning',
          code: 'CB_MARKDOWN_ANCHOR_UNRESOLVED',
          file: file.path,
          line: link.line,
          column: 1,
          message: `Markdown link "${link.url}" points to a missing heading anchor`,
          hint: `Add a heading with the "${target.anchor}" anchor or update the link.`,
        })
      }
    }
  }

  return findings
}

function unresolvedLinkHint(kind: 'markdown' | 'route', routesConfigured: boolean): string {
  if (kind === 'markdown') {
    return 'Use a known page slug, a relative .md/.mdx path, or update the link target.'
  }
  if (routesConfigured) {
    return 'Link to a page URL from links.routes, a route in links.hostRoutes, or a relative .md/.mdx path.'
  }
  return 'Use a known page slug, a relative .md/.mdx path, or update the link target. If the site serves this URL, describe its routes with links.routes or links.hostRoutes.'
}

function localeKeyFindings(
  pages: IntegrityPage[],
  options: LinkResolverOptions,
): ContentIntegrityFinding[] {
  const keyField = options.keyField ?? 'key'
  const locales = new Set(pages.map(({ facts }) => normalizedFact(facts.locale)).filter(isDefined))
  if (locales.size < 2) return []

  const findings: ContentIntegrityFinding[] = []
  const coverage = new Map<string, { file: ContentIntegrityFile; locales: Set<string> }>()
  for (const { file, facts } of pages) {
    const locale = normalizedFact(facts.locale)
    if (!locale || !facts.slug) continue
    const key = normalizedFact(facts.key)
    if (!key) {
      findings.push({
        severity: 'warning',
        code: 'CB_LOCALE_KEY_MISSING',
        file: file.path,
        line: 1,
        column: 1,
        message: `localized page for "${locale}" is missing a stable ${keyField}`,
        hint: `Add ${keyField} so translations can share a stable identity across locales.`,
      })
      continue
    }
    const entry = coverage.get(key) ?? { file, locales: new Set<string>() }
    entry.locales.add(locale)
    coverage.set(key, entry)
  }
  for (const [key, entry] of coverage) {
    if (entry.locales.size === locales.size) continue
    const missing = [...locales].filter((locale) => !entry.locales.has(locale)).sort()
    findings.push({
      severity: 'warning',
      code: 'CB_LOCALE_KEY_INCOMPLETE',
      file: entry.file.path,
      line: 1,
      column: 1,
      message: `key "${key}" is missing locale variant(s): ${missing.join(', ')}`,
      hint: 'Add the missing translations or give intentionally locale-specific pages a distinct key.',
    })
  }
  return findings
}

function addDuplicateFinding(
  findings: ContentIntegrityFinding[],
  seen: Map<string, string>,
  { file, facts }: IntegrityPage,
  field: 'title' | 'description',
  code: 'CB_TITLE_DUPLICATE' | 'CB_DESCRIPTION_DUPLICATE',
): void {
  const value = normalizedFact(facts[field])
  if (!value) return
  const prior = seen.get(value)
  if (!prior) {
    seen.set(value, file.path)
    return
  }
  findings.push({
    severity: 'warning',
    code,
    file: file.path,
    line: 1,
    column: 1,
    message: `${field} "${facts[field]?.trim()}" also appears in ${prior}`,
    hint: `Give each content page a distinct ${field}.`,
  })
}

function documentStructureFindings({ file, facts }: IntegrityPage): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = []
  const headings = file.stats.outline
  const h1s = headings.filter((heading) => heading.level === 1)

  if (facts.slug && h1s.length === 0) {
    findings.push({
      severity: 'warning',
      code: 'CB_H1_MISSING',
      file: file.path,
      line: 1,
      column: 1,
      message: 'page has no level-one heading',
      hint: 'Add one # heading that names the page.',
    })
  }
  if (h1s.length > 1) {
    findings.push({
      severity: 'warning',
      code: 'CB_H1_MULTIPLE',
      file: file.path,
      line: h1s[1].line,
      column: 1,
      message: `page has ${h1s.length} level-one headings`,
      hint: 'Keep one # heading and use ## for top-level sections.',
    })
  }
  for (let index = 1; index < headings.length; index++) {
    const previous = headings[index - 1]
    const current = headings[index]
    if (current.level <= previous.level + 1) continue
    findings.push({
      severity: 'warning',
      code: 'CB_HEADING_LEVEL_SKIPPED',
      file: file.path,
      line: current.line,
      column: 1,
      message: `heading "${current.text}" jumps from h${previous.level} to h${current.level}`,
      hint: `Insert an h${previous.level + 1} heading or lower this heading level.`,
    })
  }
  return findings
}

function resolveContentLink(
  url: string,
  sourcePath: string,
  routes: RouteTable,
): { path: string; anchor?: string; kind: 'markdown' | 'route' } | undefined {
  if (url === '' || /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) {
    return undefined
  }
  const hash = url.indexOf('#')
  const rawPath = (hash === -1 ? url : url.slice(0, hash)).split('?', 1)[0]
  const rawAnchor = hash === -1 ? undefined : url.slice(hash + 1).split('?', 1)[0]
  const anchor = rawAnchor ? decodeUriComponent(rawAnchor) : undefined

  if (rawPath === '') {
    return { path: normalizePath(sourcePath), ...(anchor ? { anchor } : {}), kind: 'markdown' }
  }
  const decodedPath = decodeUriComponent(rawPath)
  if (isRelativeMarkdownPath(decodedPath)) {
    return {
      path: joinPath(dirname(sourcePath), decodedPath),
      ...(anchor ? { anchor } : {}),
      kind: 'markdown',
    }
  }
  if (hasFileExtension(decodedPath)) return undefined
  // A relative URL resolves against the linking page's URL, and whether that
  // URL ends in a slash is the host's choice, so routes check only root-relative URLs.
  if (routes.configured && !rawPath.startsWith('/')) return undefined

  const route = normalizeRoute(rawPath)
  if (!route || routes.host.has(route)) return undefined
  const destination = routes.configured ? routes.pages.get(route) : slugTarget(route, routes.pages)
  return {
    path: destination?.path ?? `\0${route}`,
    ...(anchor ? { anchor } : {}),
    kind: 'route',
  }
}

function isRelativeMarkdownPath(value: string): boolean {
  return /\.mdx?$/i.test(value)
}

function hasFileExtension(value: string): boolean {
  return /\/[^/]+\.[a-z\d]+$/i.test(`/${value}`)
}

function routeTable(pages: IntegrityPage[], options: LinkResolverOptions): RouteTable {
  const pageUrl = contentPageUrlResolver(options)
  const out = new Map<string, ContentIntegrityFile>()
  for (const { file, facts } of pages) {
    const urls = pageUrl
      ? [pageUrl(file.path, facts)]
      : [normalizedFact(facts.slug), normalizedFact(facts.key)]
    for (const value of urls) {
      if (value) out.set(normalizeRoute(value), file)
    }
  }
  return {
    pages: out,
    host: new Set((options.hostRoutes ?? []).map(normalizeRoute)),
    configured: pageUrl !== undefined,
  }
}

function slugTarget(
  route: string,
  bySlug: Map<string, ContentIntegrityFile>,
): ContentIntegrityFile | undefined {
  return bySlug.get(route) ?? bySlug.get(route.slice(route.lastIndexOf('/') + 1))
}

function normalizeRoute(value: string): string {
  return decodeUriComponent(value)
    .replace(/^\.\//, '')
    .replace(/^\/+|\/+$/g, '')
}

/**
 * Heading ids as github-slugger makes them, which is what Astro, Fumadocs and
 * GitHub emit: lowercase, keep letters, marks, digits, `_`, `-` and spaces,
 * turn each space into `-`, and suffix repeats with `-1`, `-2`, ...
 */
const SLUG_REMOVED_RE = /[^\p{Alphabetic}\p{M}\p{Nd}\p{Pc} -]/gu

function headingAnchors(stats: DocumentStats): Set<string> {
  const anchors = new Set<string>()
  const occurrences = new Map<string, number>()
  for (const heading of stats.outline) {
    const base = heading.text.toLowerCase().replace(SLUG_REMOVED_RE, '').replaceAll(' ', '-')
    let anchor = base
    while (anchors.has(anchor)) {
      const count = (occurrences.get(base) ?? 0) + 1
      occurrences.set(base, count)
      anchor = `${base}-${count}`
    }
    anchors.add(anchor)
  }
  return anchors
}

function normalizedFact(value: string | undefined): string | undefined {
  return value?.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function dirname(path: string): string {
  const normalized = normalizePath(path)
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? (normalized.startsWith('/') ? '/' : '') : normalized.slice(0, index)
}

function joinPath(base: string, target: string): string {
  const absolute = target.startsWith('/')
  const parts = `${base}/${target}`.split('/')
  const normalized: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') normalized.pop()
    else normalized.push(part)
  }
  return `${absolute || base.startsWith('/') ? '/' : ''}${normalized.join('/')}`
}

function normalizePath(path: string): string {
  return joinPath('', path.replaceAll('\\', '/'))
}

function decodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}
