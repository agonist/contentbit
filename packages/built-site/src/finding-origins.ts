import { extractFrontmatter, readContentPageFacts } from '@contentbit/core'

import type { SiteFinding, SiteFindingCode } from './findings.js'
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
