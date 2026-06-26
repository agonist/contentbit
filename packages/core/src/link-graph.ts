import type { IndexedPage, LinkDiagnostic, LinkIndex, LinkReference } from './links.js'

export interface LinkGraphSummary {
  pages: number
  links: number
  orphans: number
}

export interface LinkGraphNode {
  id: string
  label: string
  path: string
  slug: string
  key?: string
  locale?: string
}

export interface LinkGraphEdge {
  from: string
  to?: string
  target: string
  status: 'resolved' | 'unresolved' | 'cross-locale' | 'self'
}

export interface LinkGraphView {
  summary: LinkGraphSummary
  nodes: LinkGraphNode[]
  edges: LinkGraphEdge[]
}

export function createLinkGraphView(
  index: LinkIndex,
  diagnostics: LinkDiagnostic[] = [],
): LinkGraphView {
  const pages = [...index.pages.values()]
  const nodes = pages.map((page) => ({
    id: pageIdentity(page),
    label: page.title ?? page.slug,
    path: page.path,
    slug: page.slug,
    ...(page.key ? { key: page.key } : {}),
    ...(page.locale ? { locale: page.locale } : {}),
  }))
  const pageByIdentity = new Map(pages.map((page) => [pageIdentity(page), page]))
  const pageByPath = new Map(pages.map((page) => [page.path, page]))
  const edges: LinkGraphEdge[] = []

  for (const page of pages) {
    for (const ref of page.linkRefs) {
      const target = pageByIdentity.get(referenceIdentity(ref))
      edges.push({
        from: pageIdentity(page),
        ...(target ? { to: pageIdentity(target) } : {}),
        target: ref.target ?? ref.key ?? ref.slug,
        status:
          target === page
            ? 'self'
            : ref.locale && ref.locale !== page.locale
              ? 'cross-locale'
              : 'resolved',
      })
    }
  }

  for (const diagnostic of diagnostics) {
    if (
      diagnostic.diagnostic.code !== 'CB_LINK_UNRESOLVED' &&
      diagnostic.diagnostic.code !== 'CB_LINK_LOCALE_MISSING'
    ) {
      continue
    }
    const page = pageByPath.get(diagnostic.file)
    if (!page || !diagnostic.target) continue
    edges.push({
      from: pageIdentity(page),
      target: diagnostic.target,
      status: 'unresolved',
    })
  }

  return { summary: linkGraphSummary(index), nodes, edges }
}

export function linkGraphSummary(index: LinkIndex): LinkGraphSummary {
  let links = 0
  for (const page of index.pages.values()) links += page.linksTo.length
  return {
    pages: index.pages.size,
    links,
    orphans: [...index.pages.values()].filter((page) => page.linkedFrom.length === 0).length,
  }
}

export function pageIdentity(page: Pick<IndexedPage, 'locale' | 'key' | 'slug'>): string {
  return `${page.locale ?? ''}\0${page.key ?? page.slug}`
}

function referenceIdentity(ref: LinkReference): string {
  return `${ref.locale ?? ''}\0${ref.key ?? ref.slug}`
}
