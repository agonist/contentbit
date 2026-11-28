import { normalizeRoute } from '@contentbit/core'

import { pagePath, type BuiltPage, type BuiltSite, type PagePath, type Redirect } from '../model.js'
import { httpOrigin } from '../origin.js'
import type { SiteSources } from '../sources.js'

export interface SiteIndexOptions {
  origin?: string
  hostRoutes?: string[]
  sources?: SiteSources
}

export type LinkTarget =
  | { kind: 'external' }
  | { kind: 'page'; page: BuiltPage; anchor?: string }
  | { kind: 'redirect' }
  | { kind: 'host-route' }
  | { kind: 'file'; exists: boolean }
  | { kind: 'missing'; path: PagePath }

export interface SiteIndex {
  pages: BuiltPage[]
  origin?: string
  sitemap?: string[]
  sources?: SiteSources
  resolveLink(href: string, from: BuiltPage): LinkTarget
  resolveSiteUrl(url: string): LinkTarget
  hasId(page: BuiltPage, id: string): boolean
}

const UNKNOWN_ORIGIN = 'https://site.invalid'
const BROWSER_RENDERED_TEXT = 50

/** A meta refresh page is a redirect, not browser-rendered. */
export function isBrowserRendered({ facts }: BuiltPage): boolean {
  return (
    facts.redirect === undefined &&
    facts.headings.length === 0 &&
    facts.textLength < BROWSER_RENDERED_TEXT
  )
}

export function isIndexable(page: BuiltPage): boolean {
  const { facts } = page
  return !facts.robots.noindex && facts.redirect === undefined && !isBrowserRendered(page)
}

export function isOwnCanonical(index: SiteIndex, page: BuiltPage): boolean {
  const { canonical } = page.facts
  if (!canonical) return true
  const target = index.resolveLink(canonical, page)
  return target.kind === 'page' && target.page === page
}

export function createSiteIndex(site: BuiltSite, options: SiteIndexOptions = {}): SiteIndex {
  const origin = options.origin === undefined ? undefined : httpOrigin(options.origin)
  const base = origin ?? UNKNOWN_ORIGIN
  const byPath = new Map<string, BuiltPage>(site.pages.map((page) => [page.path, page]))
  const byRoute = new Map<string, BuiltPage>()
  for (const page of site.pages) {
    const route = routeKey(page.path)
    if (!byRoute.has(route)) byRoute.set(route, page)
  }
  const ids = new Map(site.pages.map((page) => [page, new Set(page.facts.ids)]))
  const files = new Set(site.files)
  const isRedirected = redirectMatcher(site.redirects)
  const hostRoutes = new Set((options.hostRoutes ?? []).map(normalizeRoute))
  const pageUrls = new Map<BuiltPage, URL>()

  const pageUrl = (page: BuiltPage): URL => {
    let url = pageUrls.get(page)
    if (!url) {
      url = new URL(page.path.split('/').map(encodeURIComponent).join('/'), base)
      pageUrls.set(page, url)
    }
    return url
  }

  const findPage = (path: PagePath): BuiltPage | undefined => {
    const route = path.endsWith('/index.html')
      ? path.slice(0, -'index.html'.length)
      : path.replace(/\.html$/, '')
    return byPath.get(route) ?? byRoute.get(routeKey(route))
  }

  return {
    pages: site.pages,
    ...(origin && { origin }),
    ...(site.sitemap && { sitemap: site.sitemap.urls }),
    ...(options.sources && { sources: options.sources }),
    hasId: (page, id) => ids.get(page)?.has(id) ?? false,
    resolveLink: (href, from) => resolve(href, pageUrl(from)),
    resolveSiteUrl: (url) => resolve(url, base),
  }

  function resolve(href: string, against: URL | string): LinkTarget {
    let url: URL
    try {
      url = new URL(href, against)
    } catch {
      return { kind: 'external' }
    }
    if (url.origin !== base) return { kind: 'external' }

    const path = pagePath(url.pathname)
    const page = findPage(path)
    if (page) {
      const anchor = anchorOf(url.hash)
      return anchor === undefined ? { kind: 'page', page } : { kind: 'page', page, anchor }
    }
    if (files.has(path.slice(1))) return { kind: 'file', exists: true }
    if (isRedirected(path)) return { kind: 'redirect' }
    if (hostRoutes.has(normalizeRoute(path))) return { kind: 'host-route' }
    if (hasFileExtension(path)) return { kind: 'file', exists: false }
    return { kind: 'missing', path }
  }
}

function routeKey(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

function hasFileExtension(path: string): boolean {
  const extension = /\.([a-z\d]+)$/i.exec(path.slice(path.lastIndexOf('/') + 1))?.[1]
  return extension !== undefined && extension.toLowerCase() !== 'html'
}

function anchorOf(hash: string): string | undefined {
  // A text fragment's directive starts at ':~:'; what comes before it is the element id.
  const id = decodeComponent(hash.slice(1).split(':~:')[0])
  return id === '' || id.toLowerCase() === 'top' ? undefined : id
}

function redirectMatcher(redirects: Redirect[]): (path: PagePath) => boolean {
  const exact = new Set<string>()
  const patterns: RegExp[] = []
  for (const { from } of redirects) {
    if (!from.startsWith('/')) continue
    const route = routeKey(pagePath(from))
    if (route.includes('*') || route.includes('/:')) patterns.push(redirectPattern(route))
    else exact.add(route)
  }
  return (path) => exact.has(routeKey(path)) || patterns.some((pattern) => pattern.test(path))
}

function redirectPattern(route: string): RegExp {
  // A rule ending in '/*' also covers its folder itself: '/docs/*' matches '/docs'.
  const coversFolder = route.endsWith('/*')
  const source = (coversFolder ? route.slice(0, -2) : route)
    .split('/')
    .map((segment) =>
      segment.startsWith(':') ? '[^/]+' : segment.split('*').map(escapeRegExp).join('.*'),
    )
    .join('/')
  return new RegExp(`^${source}${coversFolder ? '(?:/.*)?' : ''}/?$`)
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeComponent(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}
