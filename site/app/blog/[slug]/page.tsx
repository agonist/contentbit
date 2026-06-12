import type { Metadata } from 'next'

import { ArticleRenderer } from '@/components/article-renderer'
import { BlogPostCta } from '@/components/blog-post-cta'
import { SiteHeader } from '@/components/site-header'
import { getAllPosts, getPost } from '@/lib/blog'
import Link from 'next/link'

interface PageParams {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata(props: PageParams): Promise<Metadata> {
  const { slug } = await props.params
  const post = await getPost(slug)
  return { title: post.title, description: post.description }
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function BlogPostPage(props: PageParams) {
  const { slug } = await props.params
  const post = await getPost(slug)

  return (
    <>
      <SiteHeader />
      <main className="pb-20">
        <header className="mx-auto max-w-2xl px-6 pt-14 pb-8 sm:pt-20">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
            <span className="mx-2 select-none">·</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {post.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-pretty">{post.description}</p>
        </header>

        <ArticleRenderer source={post.source} />

        {/* Closing CTA */}
        <aside className="mx-auto mt-4 max-w-2xl px-6">
          <div className="bg-card flex flex-col items-start justify-between gap-4 border p-6 shadow-sm sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold">This post is a Content Blocks document</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Validated at build time, so a broken block fails the deploy, not the reader.
              </p>
            </div>
            <BlogPostCta />
          </div>
        </aside>
      </main>
    </>
  )
}
