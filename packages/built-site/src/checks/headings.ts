import { siteFinding, type SiteFinding } from '../findings.js'
import { listOf } from './list.js'
import { isIndexable, type SiteIndex } from './site-index.js'

export function checkHeadings(index: SiteIndex): SiteFinding[] {
  const findings: SiteFinding[] = []
  for (const page of index.pages.filter(isIndexable)) {
    const h1s = page.facts.headings.filter((heading) => heading.level === 1)
    if (h1s.length === 1) continue
    findings.push(
      h1s.length === 0
        ? siteFinding(
            'CB_PAGE_H1_MISSING',
            { kind: 'page', page: page.path },
            'The page has no h1 heading.',
            'Give the page one h1 that says what it is about.',
          )
        : siteFinding(
            'CB_PAGE_H1_MULTIPLE',
            { kind: 'page', page: page.path },
            `The page has ${h1s.length} h1 headings: ${listOf(
              h1s.map(({ text }) => `"${text}"`),
              3,
            )}.`,
            'Keep one h1 for the page and make the others h2.',
          ),
    )
  }
  return findings
}
