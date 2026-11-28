import type { DocumentStats } from './analyze.js'
import type { LinkResolverOptions } from './links.js'

import { readContentPageFacts, type ContentPageFacts } from './page-facts.js'

export interface ContentIntegrityFile {
  path: string
  frontmatter: Record<string, unknown>
  stats: DocumentStats
}

interface IntegrityPage {
  file: ContentIntegrityFile
  facts: ContentPageFacts
}

export interface ContentIntegrityFinding {
  severity: 'warning'
  code:
    | 'CB_H1_MULTIPLE'
    | 'CB_HEADING_LEVEL_SKIPPED'
    | 'CB_TITLE_DUPLICATE'
    | 'CB_DESCRIPTION_DUPLICATE'
    | 'CB_LOCALE_KEY_MISSING'
    | 'CB_LOCALE_KEY_INCOMPLETE'
    | 'CB_MARKDOWN_LINK_UNRESOLVED'
  file: string
  line: number
  column: number
  message: string
  hint: string
}

/**
 * Content-quality checks that need to see more than one document. These stay
 * deliberately conservative: locale requirements apply to slugged pages, and a
 * Markdown link is checked only when it names a relative Markdown file. What
 * the site renders, such as its h1, internal URLs and heading ids, is checked
 * on the built pages instead.
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
  const scanned = new Set(files.map((file) => normalizePath(file.path)))

  const titles = new Map<string, string>()
  const descriptions = new Map<string, string>()
  for (const page of pages) {
    addDuplicateFinding(findings, titles, page, 'title', 'CB_TITLE_DUPLICATE')
    addDuplicateFinding(findings, descriptions, page, 'description', 'CB_DESCRIPTION_DUPLICATE')
    findings.push(...documentStructureFindings(page.file))
  }
  findings.push(...localeKeyFindings(pages, options))

  for (const file of files) {
    for (const link of file.stats.links.items) {
      const target = linkedMarkdownFile(link.url, file.path)
      if (target === undefined || scanned.has(target)) continue
      findings.push({
        severity: 'warning',
        code: 'CB_MARKDOWN_LINK_UNRESOLVED',
        file: file.path,
        line: link.line,
        column: 1,
        message: `Markdown link "${link.url}" does not match a scanned content page`,
        hint: 'Link to a scanned .md or .mdx file by its path from this file, or update the link target.',
      })
    }
  }

  return findings
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

function documentStructureFindings(file: ContentIntegrityFile): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = []
  const headings = file.stats.outline
  const h1s = headings.filter((heading) => heading.level === 1)

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

/** The path of the Markdown file a link names by its relative `.md` or `.mdx` path, or undefined for any other link. */
function linkedMarkdownFile(url: string, sourcePath: string): string | undefined {
  if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) return undefined
  const hash = url.indexOf('#')
  const path = decodeUriComponent((hash === -1 ? url : url.slice(0, hash)).split('?', 1)[0])
  return /\.mdx?$/i.test(path) ? joinPath(dirname(sourcePath), path) : undefined
}

/** A route as `links.routes` and `links.hostRoutes` compare it: decoded, without a leading './' or outer slashes. */
export function normalizeRoute(value: string): string {
  return decodeUriComponent(value)
    .replace(/^\.\//, '')
    .replace(/^\/+|\/+$/g, '')
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
