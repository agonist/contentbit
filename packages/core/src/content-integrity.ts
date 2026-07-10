import type { DocumentStats } from './analyze.js'

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
    | 'CB_MARKDOWN_LINK_UNRESOLVED'
    | 'CB_MARKDOWN_ANCHOR_UNRESOLVED'
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
export function scanContentIntegrity(files: ContentIntegrityFile[]): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = []
  const byPath = new Map(files.map((file) => [normalizePath(file.path), file]))

  const titles = new Map<string, string>()
  const descriptions = new Map<string, string>()
  for (const file of files) {
    addDuplicateFinding(findings, titles, file, 'title', 'CB_TITLE_DUPLICATE')
    addDuplicateFinding(findings, descriptions, file, 'description', 'CB_DESCRIPTION_DUPLICATE')
    findings.push(...documentStructureFindings(file))
  }

  for (const file of files) {
    for (const link of file.stats.links.items) {
      const target = resolveLocalMarkdownLink(link.url, file.path)
      if (!target) continue
      const destination = byPath.get(target.path)
      if (!destination) {
        findings.push({
          severity: 'warning',
          code: 'CB_MARKDOWN_LINK_UNRESOLVED',
          file: file.path,
          line: link.line,
          column: 1,
          message: `Markdown link "${link.url}" does not match a scanned content file`,
          hint: 'Use a relative .md or .mdx path that exists in the content set, or configure the host router separately.',
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

function resolveLocalMarkdownLink(
  url: string,
  sourcePath: string,
): { path: string; anchor?: string } | undefined {
  if (
    url === '' ||
    /^[a-z][a-z\d+.-]*:/i.test(url) ||
    url.startsWith('//') ||
    url.startsWith('/')
  ) {
    return undefined
  }
  const hash = url.indexOf('#')
  const rawPath = (hash === -1 ? url : url.slice(0, hash)).split('?', 1)[0]
  const rawAnchor = hash === -1 ? undefined : url.slice(hash + 1).split('?', 1)[0]
  const anchor = rawAnchor ? decodeUriComponent(rawAnchor) : undefined

  if (rawPath === '') return { path: normalizePath(sourcePath), ...(anchor ? { anchor } : {}) }
  if (!isRelativeMarkdownPath(rawPath)) return undefined
  return {
    path: joinPath(dirname(sourcePath), rawPath),
    ...(anchor ? { anchor } : {}),
  }
}

function isRelativeMarkdownPath(value: string): boolean {
  return value.startsWith('./') || value.startsWith('../') || /\.mdx?$/i.test(value)
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
