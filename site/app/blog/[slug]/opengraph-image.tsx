import { Blog } from '@/components/og/blog'
import { getAllPosts, getPost } from '@/lib/blog'
import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}
export const alt = 'contentbit blog post'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  return new ImageResponse(
    (
      <Blog
        category="Blog"
        title={post.title}
        excerpt={post.description}
        author="contentbit"
        meta={`${formatDate(post.date)} · ${post.blockCount} blocks · valid`}
        accent="#10b981"
      />
    ),
    size,
  )
}
