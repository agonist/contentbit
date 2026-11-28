import { siteFinding, type SiteFinding, type SiteFindingCode } from '../findings.js'
import type { BuiltPage } from '../model.js'
import { listOf } from './list.js'
import { isIndexable, isOwnCanonical, type SiteIndex } from './site-index.js'

const MAX_OTHERS = 3

export function checkDuplicates(index: SiteIndex): SiteFinding[] {
  const pages = index.pages.filter((page) => isIndexable(page) && isOwnCanonical(index, page))
  return [
    ...duplicates(pages, 'CB_PAGE_TITLE_DUPLICATE', 'title', (page) => page.facts.title),
    ...duplicates(
      pages,
      'CB_PAGE_DESCRIPTION_DUPLICATE',
      'description',
      (page) => page.facts.description,
    ),
  ]
}

function duplicates(
  pages: BuiltPage[],
  code: SiteFindingCode,
  label: 'title' | 'description',
  valueOf: (page: BuiltPage) => string | undefined,
): SiteFinding[] {
  const groups = new Map<string, BuiltPage[]>()
  for (const page of pages) {
    const value = valueOf(page)
    if (!value) continue
    const key = value.toLowerCase()
    const group = groups.get(key)
    if (group) group.push(page)
    else groups.set(key, [page])
  }

  const findings: SiteFinding[] = []
  for (const group of groups.values()) {
    if (group.length < 2) continue
    for (const page of group) {
      const others = group.filter((other) => other !== page).map((other) => other.path)
      findings.push(
        siteFinding(
          code,
          { kind: 'page', page: page.path },
          `${group.length} pages share the ${label} "${valueOf(page)}": ${listOf(['this one', ...others], MAX_OTHERS + 1)}.`,
          `Give each page its own ${label}, one that says what sets the page apart.`,
        ),
      )
    }
  }
  return findings
}
