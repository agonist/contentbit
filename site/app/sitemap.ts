import type { MetadataRoute } from 'next'

import { getAllPosts } from '@/lib/blog'
import { SITE_URL } from '@/lib/site'
import { source } from '@/lib/source'

export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts()
  return [
    { url: `${SITE_URL}/`, priority: 1 },
    { url: `${SITE_URL}/programmatic-seo/`, priority: 0.9 },
    { url: `${SITE_URL}/blocks/`, priority: 0.8 },
    { url: `${SITE_URL}/blog/`, priority: 0.8 },
    { url: `${SITE_URL}/playground/`, priority: 0.6 },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}/`,
      lastModified: post.date ? new Date(`${post.date}T00:00:00Z`) : undefined,
      priority: 0.7,
    })),
    ...source.getPages().map((page) => ({
      url: `${SITE_URL}${page.url}/`,
      priority: 0.7,
    })),
  ]
}
