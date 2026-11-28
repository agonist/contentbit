import {
  elementKey,
  siteFinding,
  type ElementKey,
  type SiteFinding,
  type SiteFindingOrigin,
} from '../findings.js'
import type { BuiltPage } from '../model.js'
import { isIndexable, type SiteIndex } from './site-index.js'

export function checkLinks(index: SiteIndex): SiteFinding[] {
  const findings: SiteFinding[] = []
  for (const page of index.pages) {
    const origin: SiteFindingOrigin = { kind: 'page', page: page.path }
    const links = new Map<string, { href: string; element: ElementKey }>()
    for (const link of page.facts.links) {
      const element = elementKey(link)
      links.set(`${element} ${link.href}`, { href: link.href, element })
    }
    for (const { href, element } of links.values()) {
      findings.push(...linkFindings(index, page, href, origin, element))
    }
  }
  return findings
}

function linkFindings(
  index: SiteIndex,
  page: BuiltPage,
  href: string,
  origin: SiteFindingOrigin,
  element: ElementKey,
): SiteFinding[] {
  const subject = { target: href, element }
  const target = index.resolveLink(href, page)
  switch (target.kind) {
    case 'missing':
      return [
        siteFinding(
          'CB_LINK_PAGE_MISSING',
          origin,
          `The link ${href} points to no built page, redirect or host route.`,
          'Fix the link or add a redirect. If the host app serves the path, add it to links.hostRoutes.',
          subject,
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
              subject,
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
            subject,
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
            subject,
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
