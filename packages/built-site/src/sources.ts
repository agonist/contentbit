import { normalizeRoute, type ContentPageFacts } from '@contentbit/core'

import type { BuiltSite, PagePath } from './model.js'

/** A Markdown content file of the site. */
export interface SourceDocument {
  /** The absolute path of the file. */
  file: string
  text: string
  /** The URL path that links.routes gives the document. Absent outside every route. */
  route?: string
  facts: ContentPageFacts
}

export interface SiteSources {
  /** The source document of each built page that has one. */
  pages: ReadonlyMap<PagePath, SourceDocument>
  /** The documents whose route no built page has. */
  unbuilt: SourceDocument[]
}

/** A built page gets the first document whose route is its path. */
export function siteSources(site: BuiltSite, documents: SourceDocument[]): SiteSources {
  const routed = documents.flatMap((document) =>
    document.route === undefined ? [] : [{ document, route: normalizeRoute(document.route) }],
  )
  const byRoute = new Map<string, SourceDocument>()
  for (const { document, route } of routed) {
    if (!byRoute.has(route)) byRoute.set(route, document)
  }
  const pages = new Map<PagePath, SourceDocument>()
  const built = new Set<string>()
  for (const { path } of site.pages) {
    const route = normalizeRoute(path)
    const document = byRoute.get(route)
    if (!document) continue
    pages.set(path, document)
    built.add(route)
  }
  return {
    pages,
    unbuilt: routed.filter(({ route }) => !built.has(route)).map(({ document }) => document),
  }
}
