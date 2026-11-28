import { elementKey, siteFinding, type SiteFinding } from '../findings.js'
import { isBrowserRendered, type SiteIndex } from './site-index.js'

export function checkImages(index: SiteIndex): SiteFinding[] {
  const findings: SiteFinding[] = []
  for (const page of index.pages) {
    if (isBrowserRendered(page)) continue
    const images = new Map<string, { src?: string; element: string }>()
    for (const image of page.facts.images) {
      if (image.alt !== undefined) continue
      const element = elementKey(image)
      images.set(`${element} ${image.src ?? ''}`, { src: image.src, element })
    }
    for (const { src, element } of images.values()) {
      findings.push(
        siteFinding(
          'CB_PAGE_IMAGE_ALT_MISSING',
          { kind: 'page', page: page.path },
          src
            ? `The image ${src} has no alt attribute.`
            : 'An image without a src has no alt attribute.',
          'Add alt text that describes the image, or alt="" if it is only decoration.',
          { target: src || undefined, element },
        ),
      )
    }
  }
  return findings
}
