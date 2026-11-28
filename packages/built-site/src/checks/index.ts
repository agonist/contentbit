import type { SiteFinding } from '../findings.js'
import type { BuiltSite } from '../model.js'
import { checkDuplicates } from './duplicates.js'
import { checkHeadings } from './headings.js'
import { checkHreflang } from './hreflang.js'
import { checkImages } from './images.js'
import { checkLinks } from './links.js'
import { checkMetadata } from './metadata.js'
import { checkRendering } from './rendering.js'
import { checkSitemap } from './sitemap.js'
import { checkSources } from './sources.js'
import { createSiteIndex, type SiteIndex, type SiteIndexOptions } from './site-index.js'

const CHECKS: Array<(index: SiteIndex) => SiteFinding[]> = [
  checkRendering,
  checkMetadata,
  checkDuplicates,
  checkHeadings,
  checkImages,
  checkLinks,
  checkHreflang,
  checkSitemap,
  checkSources,
]

export function checkSite(site: BuiltSite, options: SiteIndexOptions = {}): SiteFinding[] {
  const index = createSiteIndex(site, options)
  return CHECKS.flatMap((check) => check(index)).sort(
    (a, b) => compare(findingPage(a), findingPage(b)) || compare(a.code, b.code),
  )
}

function findingPage({ origin }: SiteFinding): string {
  return origin.kind === 'template' ? (origin.pages[0] ?? '') : origin.page
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
