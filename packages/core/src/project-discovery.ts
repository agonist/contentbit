import type { LinkResolverOptions } from './links.js'
import {
  discoverContentPageFacts,
  type DiscoverContentPageFactsInput,
  type DiscoveredContentPageFact,
  type DiscoveredContentPageFacts,
} from './page-discovery.js'

const FAMILY_WRAPPERS = new Set(['app', 'content', 'pages', 'routes', 'src'])
const MIN_FAMILY_FILES = 2
const MIN_LOCALE_SIBLINGS = 2

export interface DiscoverContentProjectOptions extends LinkResolverOptions {
  /** Repository root used to produce portable paths. Files outside it keep
   * their normalized input path. */
  root?: string
}

export interface DiscoveredContentProjectPage {
  sourcePath: string
  path: string
  facts: DiscoveredContentPageFacts
}

export interface DiscoveredContentProjectGroup {
  id: string
  files: number
}

export interface DiscoveredContentProject {
  pages: DiscoveredContentProjectPage[]
  families: DiscoveredContentProjectGroup[]
  locales: DiscoveredContentProjectGroup[]
}

/** Discover portable project-level page facts without requiring Contentbit
 * metadata. Exact authored facts win; conservative path inference fills only
 * repeated family and locale patterns. */
export function discoverContentProject(
  files: DiscoverContentPageFactsInput[],
  options: DiscoverContentProjectOptions = {},
): DiscoveredContentProject {
  const { root, ...linkOptions } = options
  const pages = files.map((file) => {
    const path = projectRelativePath(file.path, root)
    const discovered = discoverContentPageFacts(file, linkOptions)
    const facts = {
      ...discovered,
      identity:
        discovered.identity.source === 'path'
          ? { ...discovered.identity, value: path }
          : discovered.identity,
      ...(discovered.type ? { family: { ...discovered.type } } : {}),
    }
    return { sourcePath: file.path, path, facts }
  })

  inferPathLocales(pages)
  inferPathFamilies(pages)

  return {
    pages,
    families: summarizeFacts(pages, 'family'),
    locales: summarizeFacts(pages, 'locale'),
  }
}

function inferPathLocales(pages: DiscoveredContentProjectPage[]): void {
  const candidates = new Map<string, { position: number; locales: Set<string> }>()
  for (const page of pages) {
    const segments = pathSegments(page.path)
    for (let position = 0; position < segments.length - 1; position++) {
      const locale = segments[position]
      if (!isLocaleCandidate(locale)) continue
      const tail = segments.slice(position + 1).join('/')
      const key = `${position}\0${tail}`
      const entry = candidates.get(key) ?? { position, locales: new Set<string>() }
      entry.locales.add(locale)
      candidates.set(key, entry)
    }
  }

  const supportedPositions = new Map<number, number>()
  for (const candidate of candidates.values()) {
    if (candidate.locales.size < 2) continue
    supportedPositions.set(
      candidate.position,
      (supportedPositions.get(candidate.position) ?? 0) + 1,
    )
  }
  const localePositions = new Set(
    [...supportedPositions]
      .filter(([, siblings]) => siblings >= MIN_LOCALE_SIBLINGS)
      .map(([position]) => position),
  )
  if (localePositions.size === 0) return
  const localeGroups = new Set(
    [...candidates]
      .filter(
        ([, candidate]) => candidate.locales.size >= 2 && localePositions.has(candidate.position),
      )
      .map(([key]) => key),
  )

  for (const page of pages) {
    if (page.facts.locale) continue
    const segments = pathSegments(page.path)
    const position = [...localePositions].find((candidate) => {
      const locale = segments[candidate]
      if (!isLocaleCandidate(locale)) return false
      const tail = segments.slice(candidate + 1).join('/')
      return localeGroups.has(`${candidate}\0${tail}`)
    })
    if (position === undefined) continue
    page.facts.locale = pathFact(segments[position])
  }
}

function inferPathFamilies(pages: DiscoveredContentProjectPage[]): void {
  const candidates = new Map<string, number>()
  const candidateByPath = new Map<string, string>()
  for (const page of pages) {
    if (page.facts.family) continue
    const locale = page.facts.locale?.value.toLocaleLowerCase()
    const candidate = pathSegments(page.path)
      .slice(0, -1)
      .find(
        (segment) =>
          !FAMILY_WRAPPERS.has(segment.toLocaleLowerCase()) &&
          segment.toLocaleLowerCase() !== locale,
      )
    if (!candidate) continue
    candidateByPath.set(page.path, candidate)
    candidates.set(candidate, (candidates.get(candidate) ?? 0) + 1)
  }

  for (const page of pages) {
    if (page.facts.family) continue
    const candidate = candidateByPath.get(page.path)
    if (!candidate || (candidates.get(candidate) ?? 0) < MIN_FAMILY_FILES) continue
    page.facts.family = pathFact(candidate)
  }
}

function summarizeFacts(
  pages: DiscoveredContentProjectPage[],
  field: 'family' | 'locale',
): DiscoveredContentProjectGroup[] {
  const counts = new Map<string, number>()
  for (const page of pages) {
    const value = page.facts[field]?.value
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts].map(([id, files]) => ({ id, files })).sort((a, b) => a.id.localeCompare(b.id))
}

function pathFact(value: string): DiscoveredContentPageFact<string> {
  return { value, source: 'path', confidence: 'likely' }
}

function isLocaleCandidate(value: string | undefined): value is string {
  return Boolean(value && /^[a-z]{2}(?:-[a-z0-9]{2,8})*$/i.test(value))
}

function pathSegments(path: string): string[] {
  return path.split('/').filter(Boolean)
}

function projectRelativePath(path: string, root: string | undefined): string {
  const normalizedPath = normalizePath(path)
  if (!root) return trimRelativePrefix(normalizedPath)
  const normalizedRoot = normalizePath(root).replace(/\/$/, '')
  if (normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return normalizedPath.slice(normalizedRoot.length + 1)
  }
  return trimRelativePrefix(normalizedPath)
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+/g, '/')
}

function trimRelativePrefix(path: string): string {
  return path.startsWith('./') ? path.slice(2) : path
}
