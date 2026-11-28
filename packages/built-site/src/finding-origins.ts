import {
  elementParts,
  siteFinding,
  type FindingElement,
  type SiteFinding,
  type SiteFindingCode,
} from './findings.js'
import type { PagePath } from './model.js'
import type { SourceDocument } from './sources.js'

const FRONTMATTER_FACTS: Partial<Record<SiteFindingCode, 'title' | 'description'>> = {
  CB_PAGE_TITLE_MISSING: 'title',
  CB_PAGE_DESCRIPTION_MISSING: 'description',
}

// Each of these findings is already about several pages.
const NEVER_GROUPED = new Set<SiteFindingCode>([
  'CB_PAGE_TITLE_DUPLICATE',
  'CB_PAGE_DESCRIPTION_DUPLICATE',
])

const LAYOUT_LANDMARKS = new Set(['header', 'nav', 'footer', 'aside'])

const VALUE_EDGE = /[\s"'`()<>[\]{},]/

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
  { text, facts }: SourceDocument,
): { line: number; column?: number } | undefined {
  const fact = FRONTMATTER_FACTS[code]
  if (fact) return facts[fact] ? undefined : { line: 1 }
  const index = target ? indexOfWholeValue(text, target) : -1
  if (index === -1) return undefined
  const before = text.slice(0, index)
  return { line: before.split('\n').length, column: index - before.lastIndexOf('\n') }
}

function indexOfWholeValue(text: string, value: string): number {
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

function isLayoutElement(element: FindingElement): boolean {
  const parts = elementParts(element)
  return !parts || LAYOUT_LANDMARKS.has(parts.landmark) || parts.selector.includes('.')
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
