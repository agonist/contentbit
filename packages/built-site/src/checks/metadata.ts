import { siteFinding, type SiteFinding, type SiteFindingOrigin } from '../findings.js'
import { httpOrigin } from '../origin.js'
import { isIndexable, type SiteIndex } from './site-index.js'

const canonicalSubject = { element: 'link[rel=canonical]' }

export function checkMetadata(index: SiteIndex): SiteFinding[] {
  const findings: SiteFinding[] = []
  for (const page of index.pages) {
    const origin: SiteFindingOrigin = { kind: 'page', page: page.path }
    const { title, description, canonical, structuredData } = page.facts

    structuredData.forEach((block, position) => {
      if (block.valid) return
      findings.push(
        siteFinding(
          'CB_PAGE_STRUCTURED_DATA_INVALID',
          origin,
          `JSON-LD block ${position + 1} is invalid: ${block.error.replace(/\.$/, '')}.`,
          'Fix the JSON in the <script type="application/ld+json"> block; search engines skip a block they cannot parse.',
          { element: 'script[type=application/ld+json]' },
        ),
      )
    })
    if (!isIndexable(page)) continue

    if (!title) {
      findings.push(
        siteFinding(
          'CB_PAGE_TITLE_MISSING',
          origin,
          'The page has no title.',
          'Add a <title> that says what the page is about.',
          { element: 'title' },
        ),
      )
    }
    if (!description) {
      findings.push(
        siteFinding(
          'CB_PAGE_DESCRIPTION_MISSING',
          origin,
          'The page has no meta description.',
          'Add a <meta name="description"> that sums up the page in a sentence or two.',
          { element: 'meta[name=description]' },
        ),
      )
    }
    if (!canonical) {
      findings.push(
        siteFinding(
          'CB_PAGE_CANONICAL_MISSING',
          origin,
          'The page has no canonical URL.',
          'Add a <link rel="canonical"> with the URL of the page itself.',
          canonicalSubject,
        ),
      )
      continue
    }

    const canonicalOrigin = httpOrigin(canonical)
    if (index.origin && canonicalOrigin && canonicalOrigin !== index.origin) {
      findings.push(
        siteFinding(
          'CB_PAGE_CANONICAL_ORIGIN',
          origin,
          `The canonical URL ${canonical} is on ${canonicalOrigin}, not on the site origin ${index.origin}.`,
          `Use the site origin in canonical URLs. If ${index.origin} is the wrong origin, pass --origin or set site.origin.`,
          { ...canonicalSubject, target: canonical },
        ),
      )
    }
    const target = index.resolveLink(canonical, page)
    if (target.kind === 'page' && target.page !== page) {
      findings.push(
        siteFinding(
          'CB_PAGE_CANONICAL_ELSEWHERE',
          origin,
          `The canonical URL points to ${target.page.path}, so search engines index that page instead of this one.`,
          'Point the canonical URL at the page itself, unless the page is a copy of the other one.',
          { ...canonicalSubject, target: canonical },
        ),
      )
    }
  }
  return findings
}
