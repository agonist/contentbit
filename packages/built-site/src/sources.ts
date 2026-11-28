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

export type RoutedDocument = SourceDocument & { route: string }

export interface SiteSourceOptions {
  /** The frontmatter field whose truthy value makes a document a draft. Default 'draft'. */
  draftField?: string
  /** The frontmatter field with a document's publication date. Default 'date'. */
  dateField?: string
  /** A document dated after this day is not published yet. */
  now: Date
}

export interface SiteSources {
  /** The source document of each built page that has one. */
  pages: ReadonlyMap<PagePath, SourceDocument>
  /** The published documents whose route no built page has. */
  unbuilt: RoutedDocument[]
  /** Drafts and documents dated after today, which the site does not publish yet. */
  unpublished: ReadonlySet<SourceDocument>
}

/** A built page gets the first document whose route is its path. */
export function siteSources(
  site: BuiltSite,
  documents: SourceDocument[],
  { draftField = 'draft', dateField = 'date', now }: SiteSourceOptions,
): SiteSources {
  const today = localDay(now)
  const unpublished = new Set(
    documents.filter(({ facts: { frontmatter } }) => {
      const date = dayOf(frontmatter[dateField])
      return Boolean(frontmatter[draftField]) || (date !== undefined && date > today)
    }),
  )
  const routed = documents.filter(
    (document): document is RoutedDocument => document.route !== undefined,
  )
  const byRoute = new Map<string, SourceDocument>()
  for (const document of routed) {
    const route = normalizeRoute(document.route)
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
    unbuilt: routed.filter(
      (document) => !built.has(normalizeRoute(document.route)) && !unpublished.has(document),
    ),
    unpublished,
  }
}

/** The day a frontmatter date names, as YYYY-MM-DD: its written day, or the local day it parses to. */
function dayOf(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const written = /^\s*(\d{4}-\d{2}-\d{2})/.exec(value)?.[1]
  if (written) return written
  const time = Date.parse(value)
  return Number.isNaN(time) ? undefined : localDay(new Date(time))
}

function localDay(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
