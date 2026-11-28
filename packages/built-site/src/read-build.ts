import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { Parser } from 'htmlparser2'

import {
  pagePath,
  pagePathFromFile,
  type BuiltPage,
  type BuiltSite,
  type Redirect,
} from './model.js'
import { readRenderedPageFacts } from './read-page.js'

const SKIPPED_FOLDERS = new Set(['_astro', '_next', 'node_modules', '_not-found'])
const ERROR_PAGES = new Set(['404.html', '500.html', '404/index.html', '500/index.html'])
const READ_CONCURRENCY = 16

export async function readBuildFolder(root: string): Promise<BuiltSite> {
  const buildRoot = resolve(root)
  const [files, robotsText, redirectsText] = await Promise.all([
    findPageFiles(buildRoot),
    readOptional(join(buildRoot, 'robots.txt')),
    readOptional(join(buildRoot, '_redirects')),
  ])
  const robots = robotsText === undefined ? undefined : readRobots(robotsText)
  const [pages, sitemap] = await Promise.all([
    mapConcurrently(files, READ_CONCURRENCY, async (file): Promise<BuiltPage> => {
      const html = await readFile(join(buildRoot, file), 'utf8')
      return { path: pagePathFromFile(file), file, facts: readRenderedPageFacts(html) }
    }),
    readSitemap(buildRoot, robots?.sitemaps ?? []),
  ])
  pages.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))

  return {
    root: buildRoot,
    pages,
    ...(sitemap && { sitemap }),
    ...(robots && { robots }),
    redirects: redirectsText === undefined ? [] : readRedirects(redirectsText),
  }
}

async function findPageFiles(root: string, dir = ''): Promise<string[]> {
  const entries = await readdir(join(root, dir), { withFileTypes: true })
  const found = await Promise.all(
    entries.map(async (entry) => {
      const file = dir === '' ? entry.name : `${dir}/${entry.name}`
      if (entry.isDirectory()) {
        const skip = entry.name.startsWith('.') || SKIPPED_FOLDERS.has(entry.name)
        return skip ? [] : findPageFiles(root, file)
      }
      const isPage = entry.isFile() && entry.name.endsWith('.html') && !ERROR_PAGES.has(file)
      return isPage ? [file] : []
    }),
  )
  return found.flat()
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

async function mapConcurrently<T, R>(
  items: T[],
  limit: number,
  map: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await map(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function readRobots(text: string): NonNullable<BuiltSite['robots']> {
  const sitemaps = new Set<string>()
  const disallow = new Set<string>()
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i.exec(line.replace(/#.*/, ''))
    if (!match?.[2]) continue
    const field = match[1].toLowerCase()
    if (field === 'sitemap') sitemaps.add(match[2])
    if (field === 'disallow') disallow.add(match[2])
  }
  return { sitemaps: [...sitemaps], disallow: [...disallow] }
}

async function readSitemap(
  root: string,
  robotsSitemaps: string[],
): Promise<BuiltSite['sitemap'] | undefined> {
  const files: string[] = []
  const urls: string[] = []
  const seen = new Set<string>()

  const visit = async (file: string | undefined) => {
    if (file === undefined || seen.has(file)) return
    seen.add(file)
    const xml = await readOptional(join(root, file))
    if (xml === undefined) return
    files.push(file)
    const entries = readSitemapXml(xml)
    urls.push(...entries.urls)
    for (const url of entries.sitemaps) await visit(sitemapFile(url))
  }

  if (robotsSitemaps.length > 0) {
    for (const url of robotsSitemaps) await visit(sitemapFile(url))
  } else {
    await visit('sitemap-index.xml')
    if (files.length === 0) await visit('sitemap.xml')
  }
  return files.length === 0 ? undefined : { files, urls }
}

function sitemapFile(url: string): string | undefined {
  let path: string
  try {
    path = pagePath(new URL(url, 'https://build.invalid').pathname)
  } catch {
    return undefined
  }
  return path.endsWith('/') ? undefined : path.slice(1)
}

function readSitemapXml(xml: string): { sitemaps: string[]; urls: string[] } {
  const sitemaps: string[] = []
  const urls: string[] = []
  const open: string[] = []
  let loc: string[] | undefined
  const parser = new Parser(
    {
      onopentag(name) {
        open.push(name)
        if (name === 'loc') loc = []
      },
      ontext(text) {
        loc?.push(text)
      },
      onclosetag(name) {
        open.pop()
        if (name !== 'loc' || loc === undefined) return
        const value = loc.join('').trim()
        loc = undefined
        if (value === '') return
        if (open.at(-1) === 'sitemap') sitemaps.push(value)
        if (open.at(-1) === 'url') urls.push(value)
      },
    },
    { xmlMode: true },
  )
  parser.write(xml)
  parser.end()
  return { sitemaps, urls }
}

function readRedirects(text: string): Redirect[] {
  const redirects: Redirect[] = []
  for (const line of text.split(/\r?\n/)) {
    const [from, to, status] = line.trim().split(/\s+/)
    if (!from || !to || from.startsWith('#')) continue
    const code = Number.parseInt(status ?? '', 10)
    redirects.push({ from, to, status: Number.isNaN(code) ? 301 : code })
  }
  return redirects
}
