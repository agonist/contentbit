import { siteFinding, type SiteFinding, type SiteFindingOrigin } from '../findings.js'
import type { BuiltPage } from '../model.js'
import { isIndexable, type SiteIndex } from './site-index.js'

export function checkLinks(index: SiteIndex): SiteFinding[] {
  const findings: SiteFinding[] = []
  for (const page of index.pages) {
    const origin: SiteFindingOrigin = { kind: 'page', page: page.path }
    const hrefs = new Set(page.facts.links.map(({ href }) => href))
    for (const href of hrefs) findings.push(...linkFindings(index, page, href, origin))
  }
  return findings
}

function linkFindings(
  index: SiteIndex,
  page: BuiltPage,
  href: string,
  origin: SiteFindingOrigin,
): SiteFinding[] {
  const target = index.resolveLink(href, page)
  switch (target.kind) {
    case 'missing':
      return [
        siteFinding(
          'CB_LINK_PAGE_MISSING',
          origin,
          `The link ${href} points to no built page, redirect or host route.`,
          'Fix the link or add a redirect. If the host app serves the path, add it to links.hostRoutes.',
        ),
      ]
    case 'file':
      return target.exists
        ? []
        : [
            siteFinding(
              'CB_LINK_FILE_MISSING',
              origin,
              `The link ${href} points to a file that is not in the build.`,
              'Add the file to the build or fix the link.',
            ),
          ]
    case 'page': {
      const findings: SiteFinding[] = []
      if (target.anchor !== undefined && !index.hasId(target.page, target.anchor)) {
        findings.push(
          siteFinding(
            'CB_LINK_ANCHOR_MISSING',
            origin,
            `The link ${href} points to an id that ${target.page === page ? 'this page' : target.page.path} does not have.`,
            'Point the link at an id the page has, or give the element it means that id.',
          ),
        )
      }
      if (target.page.facts.robots.noindex && isIndexable(page)) {
        findings.push(
          siteFinding(
            'CB_LINK_NOINDEX_TARGET',
            origin,
            `The link ${href} points to ${target.page.path}, a page marked noindex.`,
            'Link to an indexable page instead, or remove noindex from the target if search engines should index it.',
          ),
        )
      }
      return findings
    }
    case 'external':
    case 'redirect':
    case 'host-route':
      return []
  }
}
