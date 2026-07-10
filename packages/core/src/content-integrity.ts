import type { DocumentStats } from './analyze.js'
import type { LinkResolverOptions } from './links.js'

export interface ContentIntegrityFile {
  path: string
  frontmatter: Record<string, unknown>
  stats: DocumentStats
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
 * while Markdown links are checked only when they name a local Markdown file
 * or an in-document anchor. Site-router URLs remain the host app's concern.
 */
export function scanContentIntegrity(
  files: ContentIntegrityFile[],
  options: LinkResolverOptions = {},
): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = []
  const byPath = new Map(files.map((file) => [normalizePath(file.path), file]))
  const byRoute = routeIndex(files, options)

  const titles = new Map<string, string>()
  const descriptions = new Map<string, string>()
  for (const file of files) {
    addDuplicateFinding(findings, titles, file, 'title', 'CB_TITLE_DUPLICATE')
    addDuplicateFinding(findings, descriptions, file, 'description', 'CB_DESCRIPTION_DUPLICATE')
    findings.push(...documentStructureFindings(file))
  }
  findings.push(...localeKeyFindings(files, options))

  for (const file of files) {
    for (const link of file.stats.links.items) {
      const target = resolveContentLink(link.url, file.path, byRoute)
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
          hint: 'Use a known page slug, a relative .md/.mdx path, or update the link target.',
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

function localeKeyFindings(
  files: ContentIntegrityFile[],
  options: LinkResolverOptions,
): ContentIntegrityFinding[] {
  const localeField = options.localeField ?? 'locale'
  const keyField = options.keyField ?? 'key'
  const slugField = options.slugField ?? 'slug'
  const locales = new Set(
    files
      .map((file) => normalizedFrontmatterString(file.frontmatter[localeField]))
      .filter(isDefined),
  )
  if (locales.size < 2) return []

  const findings: ContentIntegrityFinding[] = []
  const coverage = new Map<string, { file: ContentIntegrityFile; locales: Set<string> }>()
  for (const file of files) {
    const locale = normalizedFrontmatterString(file.frontmatter[localeField])
    if (!locale || !normalizedFrontmatterString(file.frontmatter[slugField])) continue
    const key = normalizedFrontmatterString(file.frontmatter[keyField])
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
  file: ContentIntegrityFile,
  field: 'title' | 'description',
  code: 'CB_TITLE_DUPLICATE' | 'CB_DESCRIPTION_DUPLICATE',
): void {
  const value = normalizedFrontmatterString(file.frontmatter[field])
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
    message: `${field} "${String(file.frontmatter[field]).trim()}" also appears in ${prior}`,
    hint: `Give each content page a distinct ${field}.`,
  })
}

function documentStructureFindings(file: ContentIntegrityFile): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = []
  const headings = file.stats.outline
  const h1s = headings.filter((heading) => heading.level === 1)
  const isPage = typeof file.frontmatter.slug === 'string' && file.frontmatter.slug.trim() !== ''

  if (isPage && h1s.length === 0) {
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
  byRoute: Map<string, ContentIntegrityFile>,
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
  if (isRelativeMarkdownPath(rawPath)) {
    return {
      path: joinPath(dirname(sourcePath), rawPath),
      ...(anchor ? { anchor } : {}),
      kind: 'markdown',
    }
  }
  if (hasFileExtension(rawPath)) return undefined

  const destination = routeTarget(rawPath, byRoute)
  return {
    path: destination?.path ?? `\0${normalizeRoute(rawPath)}`,
    ...(anchor ? { anchor } : {}),
    kind: 'route',
  }
}

function isRelativeMarkdownPath(value: string): boolean {
  return value.startsWith('./') || value.startsWith('../') || /\.mdx?$/i.test(value)
}

function hasFileExtension(value: string): boolean {
  return /\/[^/]+\.[a-z\d]+$/i.test(`/${value}`)
}

function routeIndex(
  files: ContentIntegrityFile[],
  options: LinkResolverOptions,
): Map<string, ContentIntegrityFile> {
  const slugField = options.slugField ?? 'slug'
  const keyField = options.keyField ?? 'key'
  const out = new Map<string, ContentIntegrityFile>()
  for (const file of files) {
    for (const field of [slugField, keyField]) {
      const value = normalizedFrontmatterString(file.frontmatter[field])
      if (value) out.set(normalizeRoute(value), file)
    }
  }
  return out
}

function routeTarget(
  rawPath: string,
  byRoute: Map<string, ContentIntegrityFile>,
): ContentIntegrityFile | undefined {
  const route = normalizeRoute(rawPath)
  if (!route) return undefined
  return byRoute.get(route) ?? byRoute.get(route.slice(route.lastIndexOf('/') + 1))
}

function normalizeRoute(value: string): string {
  return decodeUriComponent(value)
    .replace(/^\.\//, '')
    .replace(/^\/+|\/+$/g, '')
}

function headingAnchors(stats: DocumentStats): Set<string> {
  const anchors = new Set<string>()
  const occurrences = new Map<string, number>()
  for (const heading of stats.outline) {
    const base = headingAnchor(heading.text)
    if (!base) continue
    const count = occurrences.get(base) ?? 0
    occurrences.set(base, count + 1)
    anchors.add(count === 0 ? base : `${base}-${count}`)
  }
  return anchors
}

function headingAnchor(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
}

function normalizedFrontmatterString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
  return normalized || undefined
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
