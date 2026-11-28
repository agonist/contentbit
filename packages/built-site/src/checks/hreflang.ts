import { siteFinding, type SiteFinding, type SiteFindingOrigin } from '../findings.js'
import type { BuiltPage } from '../model.js'
import type { SiteIndex } from './site-index.js'

export function checkHreflang(index: SiteIndex): SiteFinding[] {
  const findings: SiteFinding[] = []
  for (const page of index.pages) {
    const { alternates } = page.facts
    const origin: SiteFindingOrigin = { kind: 'page', page: page.path }
    const hrefs = new Set(alternates.map(({ href }) => href))
    for (const href of hrefs) {
      const target = index.resolveLink(href, page)
      if (target.kind === 'missing') {
        findings.push(
          siteFinding(
            'CB_SITE_HREFLANG_NOT_RECIPROCAL',
            origin,
            `The hreflang alternate ${href} points to no built page.`,
            'Point the alternate at the built page for that language, or remove it.',
          ),
        )
      } else if (target.kind === 'page' && !listsAlternate(index, target.page, page)) {
        findings.push(
          siteFinding(
            'CB_SITE_HREFLANG_NOT_RECIPROCAL',
            origin,
            `The hreflang alternate ${href} points to ${target.page.path}, which lists no alternate back to this page.`,
            'List the same hreflang alternates, this page included, on every page of the group.',
          ),
        )
      }
    }
    if (
      alternates.length >= 2 &&
      !alternates.some(({ hreflang }) => hreflang.toLowerCase() === 'x-default')
    ) {
      findings.push(
        siteFinding(
          'CB_SITE_HREFLANG_X_DEFAULT_MISSING',
          origin,
          `The page lists ${alternates.length} hreflang alternates and none is x-default.`,
          'Add an x-default alternate for readers whose language matches none of the others.',
        ),
      )
    }
  }
  return findings
}

function listsAlternate(index: SiteIndex, page: BuiltPage, target: BuiltPage): boolean {
  if (page === target) return true
  return page.facts.alternates.some(({ href }) => {
    const resolved = index.resolveLink(href, page)
    return resolved.kind === 'page' && resolved.page === target
  })
}
