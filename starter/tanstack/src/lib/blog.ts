import {
  extractFrontmatter,
  parseDocument,
  parseLinkFrontmatter,
  stripFrontmatter,
} from '@contentbit/core'
import type { LinkFrontmatter, LinkTarget } from '@contentbit/core'

import espressoSource from '../../content/dialing-in-espresso.md?raw'
import grinderSource from '../../content/grinder-setting-notes.md?raw'
import logSource from '../../content/espresso-recipe-log.md?raw'

const sources = [espressoSource, grinderSource, logSource]

export interface BlogArticle {
  source: string
  meta: LinkFrontmatter
}

export const articles: BlogArticle[] = sources.map((source) => {
  const data = extractFrontmatter(source)?.data ?? {}
  const parsed = parseLinkFrontmatter(data)
  if (!parsed.ok || !parsed.value) {
    throw new Error('Article has invalid internal-link frontmatter.')
  }
  return { source, meta: parsed.value }
})

export function articleBySlug(slug: string): BlogArticle | undefined {
  return articles.find((article) => article.meta.slug === slug)
}

export function targetSlug(target: LinkTarget): string {
  if (typeof target === 'string') return target
  return target.slug ?? target.key ?? ''
}

export function targetsFor(article: BlogArticle): string[] {
  return (article.meta.linksTo ?? []).map(targetSlug).filter(Boolean)
}

export function titleFor(slug: string): string {
  return articleBySlug(slug)?.meta.title ?? slug
}

export function linkedFromFor(slug: string): string[] {
  return articles
    .filter((article) => targetsFor(article).includes(slug))
    .map((article) => article.meta.slug)
}

export function wordCount(article: BlogArticle): number {
  return stripFrontmatter(article.source).match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0
}

export function blockCount(article: BlogArticle): number {
  return parseDocument(stripFrontmatter(article.source)).document.children.filter(
    (node) => node.type === 'block',
  ).length
}

export function keywordCount(article: BlogArticle): number {
  return (article.meta.keywords?.primary ? 1 : 0) + (article.meta.keywords?.secondary?.length ?? 0)
}
