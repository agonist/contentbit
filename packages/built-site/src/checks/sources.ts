import {
  siteFinding,
  type FixedSubject,
  type SiteFinding,
  type SiteFindingCode,
} from '../findings.js'
import type { BuiltPage } from '../model.js'
import type { SourceDocument } from '../sources.js'
import { isIndexable, type SiteIndex } from './site-index.js'

interface WrittenFact {
  code: SiteFindingCode
  fact: 'title' | 'description'
  element: FixedSubject
  label: string
  tag: string
}

const WRITTEN_FACTS: WrittenFact[] = [
  {
    code: 'CB_PAGE_TITLE_MISMATCH',
    fact: 'title',
    element: 'title',
    label: 'title',
    tag: '<title>',
  },
  {
    code: 'CB_PAGE_DESCRIPTION_MISMATCH',
    fact: 'description',
    element: 'meta[name=description]',
    label: 'meta description',
    tag: '<meta name="description">',
  },
]

const CHANGED_AFTER_BUILD =
  ' The document changed after the build, so rebuild the site and check again.'
const STALE_SEVERITY = { severity: 'warning' } as const

export function checkSources(index: SiteIndex): SiteFinding[] {
  const { sources } = index
  if (!sources) return []

  const findings: SiteFinding[] = []
  for (const page of index.pages) {
    const document = sources.pages.get(page.path)
    if (document && !sources.unpublished.has(document) && isIndexable(page)) {
      findings.push(...mismatches(page, document, sources.stale.has(document)))
    }
  }
  for (const document of sources.unbuilt) {
    const target = index.resolveSiteUrl(document.route)
    if (target.kind !== 'missing') continue
    const stale = sources.stale.has(document)
    findings.push(
      siteFinding(
        'CB_SITE_SOURCE_NOT_BUILT',
        { kind: 'source', file: document.file, line: 1, page: target.path },
        `links.routes gives this document the route ${document.route}, which has no built page, redirect or host route.${stale ? CHANGED_AFTER_BUILD : ''}`,
        'Build the page, or fix links.routes if the site serves the document at another URL. check skips drafts and documents dated after today; site.draftField and site.dateField name their frontmatter fields.',
        { target: document.route, ...(stale && STALE_SEVERITY) },
      ),
    )
  }
  return findings
}

function mismatches(page: BuiltPage, document: SourceDocument, stale: boolean): SiteFinding[] {
  return WRITTEN_FACTS.flatMap(({ code, fact, element, label, tag }) => {
    const rendered = page.facts[fact]
    const written = document.facts[fact]
    if (!rendered || !written || oneContainsTheOther(rendered, written)) return []
    return siteFinding(
      code,
      { kind: 'page', page: page.path },
      `The page's ${label} "${rendered}" does not contain the ${fact} "${written}" from its source document.${stale ? CHANGED_AFTER_BUILD : ''}`,
      `Render the frontmatter ${fact} in the ${tag}, or change the frontmatter to the ${fact} the page shows.`,
      { target: written, element, ...(stale && STALE_SEVERITY) },
    )
  })
}

function oneContainsTheOther(rendered: string, written: string): boolean {
  const a = comparable(rendered)
  const b = comparable(written)
  return a.includes(b) || b.includes(a)
}

function comparable(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}
