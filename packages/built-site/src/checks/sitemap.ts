import { siteFinding, type SiteFinding } from '../findings.js'
import { pagePath, type BuiltPage } from '../model.js'
import { isIndexable, isOwnCanonical, type SiteIndex } from './site-index.js'

export function checkSitemap(index: SiteIndex): SiteFinding[] {
  const { origin, sitemap } = index
  if (origin === undefined || sitemap === undefined) return []

  const findings: SiteFinding[] = []
  const listed = new Set<BuiltPage>()
  for (const loc of new Set(sitemap)) {
    let url: URL
    try {
      url = new URL(loc, origin)
    } catch {
      continue
    }
    const page = pagePath(url.pathname)
    const target = index.resolveSiteUrl(loc)
    if (target.kind === 'page') {
      listed.add(target.page)
      if (target.page.facts.robots.noindex) {
        findings.push(
          siteFinding(
            'CB_SITE_SITEMAP_NOINDEX',
            { kind: 'page', page: target.page.path },
            `The sitemap lists ${loc}, a page marked noindex.`,
            'Leave noindex pages out of the sitemap, or remove noindex if search engines should index the page.',
          ),
        )
      }
    } else if (target.kind === 'external') {
      findings.push(
        siteFinding(
          'CB_SITE_SITEMAP_URL_NOT_BUILT',
          { kind: 'page', page },
          `The sitemap lists ${loc}, on ${url.origin} instead of the site origin ${origin}.`,
          'List each page at its URL on the site origin. If the site origin is wrong, set site.origin or pass --origin.',
        ),
      )
    } else if (target.kind === 'missing' || (target.kind === 'file' && !target.exists)) {
      findings.push(
        siteFinding(
          'CB_SITE_SITEMAP_URL_NOT_BUILT',
          { kind: 'page', page },
          `The sitemap lists ${loc}, which resolves to no built page.`,
          'Remove the URL from the sitemap, or build the page it names.',
        ),
      )
    }
  }

  for (const page of index.pages) {
    if (listed.has(page) || !isIndexable(page) || !isOwnCanonical(index, page)) continue
    findings.push(
      siteFinding(
        'CB_SITE_SITEMAP_PAGE_MISSING',
        { kind: 'page', page: page.path },
        'This indexable page is not in the sitemap.',
        'Add the page to the sitemap, or mark it noindex if search engines should not index it.',
      ),
    )
  }
  return findings
}
