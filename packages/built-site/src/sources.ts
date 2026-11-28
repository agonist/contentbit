import { normalizeRoute, type ContentPageFacts } from '@contentbit/core'

import type { BuiltSite, PagePath } from './model.js'

export interface SourceDocument {
  file: string
  text: string
  route?: string
  facts: ContentPageFacts
  modified: number
}

export type RoutedDocument = SourceDocument & { route: string }

export interface SiteSourceOptions {
  draftField?: string
  dateField?: string
  now: Date
}

export interface SiteSources {
  pages: ReadonlyMap<PagePath, SourceDocument>
  unbuilt: RoutedDocument[]
  unpublished: ReadonlySet<SourceDocument>
  stale: ReadonlySet<SourceDocument>
}

export function siteSources(
  site: BuiltSite,
  documents: SourceDocument[],
  { draftField = 'draft', dateField = 'date', now }: SiteSourceOptions,
): SiteSources {
  const today = localDay(now)
  const unpublished = new Set(
    documents.filter(({ facts: { frontmatter } }) => {
      const date = dayOf(frontmatter[dateField])
      return isTrue(frontmatter[draftField]) || (date !== undefined && date > today)
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
    stale: new Set(
      documents.filter(({ modified }) => site.builtAt !== undefined && modified > site.builtAt),
    ),
  }
}

function isTrue(value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true')
}

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
