import type { LinkResolverOptions } from './links.js'
import type { ContentPageFacts } from './page-facts.js'

type RouteFacts = Pick<ContentPageFacts, 'slug' | 'key' | 'locale'>

const PLACEHOLDER_RE = /\{([^{}]*)\}/g
const PLACEHOLDERS = ['path', 'slug', 'key', 'locale']

/** Build the public-URL lookup that `links.routes` describes, or undefined
 * when the project configures no routes. The lookup returns undefined for a
 * page outside every route directory, or one that lacks a fact its pattern
 * needs. */
export function contentPageUrlResolver(
  options: LinkResolverOptions,
): ((path: string, facts: RouteFacts) => string | undefined) | undefined {
  if (!options.routes) return undefined
  const routes = Object.entries(options.routes)
    .map(([dir, url]) => {
      for (const [, name] of url.matchAll(PLACEHOLDER_RE)) {
        if (!PLACEHOLDERS.includes(name)) {
          const known = PLACEHOLDERS.map((placeholder) => `{${placeholder}}`).join(', ')
          throw new Error(
            `links.routes pattern "${url}" uses unknown placeholder {${name}}. Use one of ${known}.`,
          )
        }
      }
      return { dir: normalizePath(dir).replace(/\/$/, ''), url }
    })
    .sort((a, b) => b.dir.length - a.dir.length)

  return (path, facts) => {
    const file = normalizePath(path)
    const route = routes.find(({ dir }) => file.startsWith(`${dir}/`))
    if (!route) return undefined
    const values: Record<string, string | undefined> = {
      path: file
        .slice(route.dir.length + 1)
        .replace(/\.mdx?$/i, '')
        .replace(/(^|\/)index$/, ''),
      slug: facts.slug,
      key: facts.key,
      locale: facts.locale ?? options.defaultLocale,
    }
    let complete = true
    const url = route.url.replace(PLACEHOLDER_RE, (_, name: string) => {
      const value = values[name]
      if (value === undefined) complete = false
      return value ?? ''
    })
    return complete ? url : undefined
  }
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+/g, '/').replace(/^\.\//, '')
}
