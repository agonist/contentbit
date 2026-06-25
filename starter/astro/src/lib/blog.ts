import { genericBlocks } from "@contentbit/blocks"
import {
  createBlockRegistry,
  parseDocument,
  parseLinkFrontmatter,
  validateDocument,
} from "@contentbit/core"
import type { LinkTarget } from "@contentbit/core"
import { getCollection } from "astro:content"

import customBlocks from "../../blocks/registry"

export const blogSlugs = [
  "dialing-in-espresso",
  "grinder-setting-notes",
  "espresso-recipe-log",
]

const registry = createBlockRegistry().use(genericBlocks()).use(customBlocks)

export async function getBlogArticles() {
  const entries = await getCollection("articles")
  const entryBySlug = new Map(
    entries.map((entry) => [String(entry.data.slug), entry]),
  )

  return Promise.all(
    blogSlugs.map(async (slug) => {
      const entry = entryBySlug.get(slug)
      if (!entry?.body)
        throw new Error(`Entry "${slug}" not found in the articles collection.`)

      const parsed = parseLinkFrontmatter(entry.data)
      if (!parsed.ok || !parsed.value) {
        throw new Error(
          `Entry "${slug}" has invalid internal-link frontmatter.`,
        )
      }

      // Static pages render at build time, so invalid blocks fail the build here.
      const result = validateDocument(parseDocument(entry.body), registry)
      return { entry, meta: parsed.value, result }
    }),
  )
}

export type BlogArticle = Awaited<ReturnType<typeof getBlogArticles>>[number]

export function targetSlug(target: LinkTarget): string {
  if (typeof target === "string") return target
  return target.slug ?? target.key ?? ""
}

export function targetsFor(article: BlogArticle): string[] {
  return (article.meta.linksTo ?? []).map(targetSlug).filter(Boolean)
}

export function titleFor(slug: string, articles: BlogArticle[]): string {
  return (
    articles.find((article) => article.meta.slug === slug)?.meta.title ?? slug
  )
}

export function linkedFromFor(slug: string, articles: BlogArticle[]): string[] {
  return articles
    .filter((article) => targetsFor(article).includes(slug))
    .map((article) => article.meta.slug)
}

export function wordCount(markdown: string): number {
  return markdown.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)?.length ?? 0
}

export function blockCount(article: BlogArticle): number {
  return article.result.document.children.filter(
    (node) => node.type === "block",
  ).length
}

export function keywordCount(article: BlogArticle): number {
  return (
    (article.meta.keywords?.primary ? 1 : 0) +
    (article.meta.keywords?.secondary?.length ?? 0)
  )
}
