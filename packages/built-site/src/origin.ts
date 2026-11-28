import type { BuiltSite } from './model.js'

export function httpOrigin(value: string): string | undefined {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined
}

export function inferOrigin(site: BuiltSite): string | undefined {
  const counts = new Map<string, number>()
  for (const { facts } of site.pages) {
    const origin = facts.canonical === undefined ? undefined : httpOrigin(facts.canonical)
    if (origin) counts.set(origin, (counts.get(origin) ?? 0) + 1)
  }
  let best: string | undefined
  let bestCount = 0
  for (const [origin, count] of counts) {
    if (count > bestCount) [best, bestCount] = [origin, count]
  }
  return best
}
