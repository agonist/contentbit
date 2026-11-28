import { siteFinding, type SiteFinding } from '../findings.js'
import { listOf } from './list.js'
import { isBrowserRendered, type SiteIndex } from './site-index.js'

export function checkImages(index: SiteIndex): SiteFinding[] {
  const findings: SiteFinding[] = []
  for (const page of index.pages) {
    if (isBrowserRendered(page)) continue
    const sources = new Set(
      page.facts.images.filter(({ alt }) => alt === undefined).map(({ src }) => src ?? ''),
    )
    if (sources.size === 0) continue
    const names = [...sources].map((src) => src || 'an image without src')
    findings.push(
      siteFinding(
        'CB_PAGE_IMAGE_ALT_MISSING',
        { kind: 'page', page: page.path },
        `${sources.size === 1 ? '1 image has' : `${sources.size} images have`} no alt attribute: ${listOf(names, 3)}.`,
        'Add alt text that describes each image, or alt="" to an image that is only decoration.',
      ),
    )
  }
  return findings
}
