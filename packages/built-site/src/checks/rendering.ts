import { siteFinding, type SiteFinding } from '../findings.js'
import { isBrowserRendered, type SiteIndex } from './site-index.js'

export function checkRendering(index: SiteIndex): SiteFinding[] {
  return index.pages
    .filter(isBrowserRendered)
    .map((page) =>
      siteFinding(
        'CB_PAGE_BROWSER_RENDERED',
        { kind: 'page', page: page.path },
        `The HTML has no headings and ${page.facts.textLength} characters of text, so the page's content renders only in the browser.`,
        'Render the content into the HTML at build time or on the server, so crawlers read it without running JavaScript.',
      ),
    )
}
