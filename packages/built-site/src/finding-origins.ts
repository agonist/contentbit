import { extractFrontmatter, readContentPageFacts } from '@contentbit/core'

import { siteFinding, type SiteFinding, type SiteFindingCode } from './findings.js'
import type { PagePath } from './model.js'

/** The Markdown source document of a built page. */
export interface SourceDocument {
  file: string
  text: string
}

const FRONTMATTER_FACTS: Partial<Record<SiteFindingCode, 'title' | 'description'>> = {
  CB_PAGE_TITLE_MISSING: 'title',
  CB_PAGE_DESCRIPTION_MISSING: 'description',
}

// Each of these findings is already about several pages.
const NEVER_GROUPED = new Set<SiteFindingCode>([
  'CB_PAGE_TITLE_DUPLICATE',
  'CB_PAGE_DESCRIPTION_DUPLICATE',
])

// Landmarks that a layout renders on every page, unlike the page's own content in main.
const LAYOUT_LANDMARKS = new Set(['header', 'nav', 'footer', 'aside'])

// What can stand next to a value written in Markdown or frontmatter, so /fr/ is not found inside /fr/blog/.
const VALUE_EDGE = /[\s"'`()<>[\]{},]/

/**
 * Gives a page finding a source origin when its page's source document
 * writes the problem: at the first place the document writes the finding's
 * target, or at line 1 for a missing title or description that the
 * frontmatter lacks too. Every other finding is returned as it was.
 */
export function attributeToSources(
  findings: SiteFinding[],
  sources: ReadonlyMap<PagePath, SourceDocument>,
): SiteFinding[] {
  return findings.map((finding) => {
    if (finding.origin.kind !== 'page') return finding
    const { page } = finding.origin
    const source = sources.get(page)
    const location = source && sourceLocation(finding, source)
    if (!source || !location) return finding
    return { ...finding, origin: { kind: 'source', file: source.file, ...location, page } }
  })
}

function sourceLocation(
  { code, target }: SiteFinding,
  { text }: SourceDocument,
): { line: number; column?: number } | undefined {
  const fact = FRONTMATTER_FACTS[code]
  if (fact) {
    return readContentPageFacts(extractFrontmatter(text)?.data ?? {})[fact]
      ? undefined
      : { line: 1 }
  }
  const index = target ? indexOfValue(text, target) : -1
  if (index === -1) return undefined
  const before = text.slice(0, index)
  return { line: before.split('\n').length, column: index - before.lastIndexOf('\n') }
}

function indexOfValue(text: string, value: string): number {
  for (let index = text.indexOf(value); index !== -1; index = text.indexOf(value, index + 1)) {
    const before = text[index - 1]
    const after = text[index + value.length]
    if ((!before || VALUE_EDGE.test(before)) && (!after || VALUE_EDGE.test(after))) return index
  }
  return -1
}

interface PageFinding {
  finding: SiteFinding
  page: PagePath
}

/**
 * Replaces the page findings that share a code and an element on two or
 * more pages with one template finding, at the place of the first. A finding
 * without an element groups by its code alone. Source findings, and the
 * duplicate title and description findings, are returned as they were.
 */
export function groupTemplateFindings(findings: SiteFinding[]): SiteFinding[] {
  const groups = new Map<string, PageFinding[]>()
  for (const finding of findings) {
    if (finding.origin.kind !== 'page' || NEVER_GROUPED.has(finding.code)) continue
    const key = groupKey(finding)
    const member = { finding, page: finding.origin.page }
    const group = groups.get(key)
    if (group) group.push(member)
    else groups.set(key, [member])
  }

  const templates = new Map<SiteFinding, SiteFinding>()
  const grouped = new Set<SiteFinding>()
  for (const group of groups.values()) {
    const pages = [...new Set(group.map(({ page }) => page))]
    if (pages.length < 2) continue
    templates.set(group[0].finding, templateFinding(group, pages))
    for (const { finding } of group) grouped.add(finding)
  }
  return findings.flatMap(
    (finding) => templates.get(finding) ?? (grouped.has(finding) ? [] : finding),
  )
}

/**
 * A bare element in the page's content, such as `main a`, says nothing about a layout: two
 * pages that each have their own broken link there are two content problems. It groups only
 * with the same target on other pages. Every other element groups by itself.
 */
function groupKey({ code, element, target }: SiteFinding): string {
  if (element === undefined || isLayoutElement(element)) return `${code} ${element ?? ''}`
  return `${code} ${element} ${target ?? ''}`
}

/** A head subject such as `link[rel=canonical]`, an element with a class, or one in a layout landmark. */
function isLayoutElement(element: string): boolean {
  const space = element.indexOf(' ')
  if (space === -1) return true
  return LAYOUT_LANDMARKS.has(element.slice(0, space)) || element.slice(space + 1).includes('.')
}

function templateFinding(group: PageFinding[], pages: PagePath[]): SiteFinding {
  const [{ finding: first, page }] = group
  const { code, element, message, hint } = first
  const reach = element
    ? `${element} gives this finding on ${pages.length} pages, so the layout or a shared component renders it.`
    : `This finding comes up on ${pages.length} pages.`
  return {
    ...siteFinding(
      code,
      { kind: 'template', ...(element !== undefined && { element }), pages },
      `${reach} On ${page}: ${message}`,
      hint,
      { element },
    ),
    occurrences: group.map(({ finding: { target }, page }) => ({
      page,
      ...(target !== undefined && { target }),
    })),
  }
}
