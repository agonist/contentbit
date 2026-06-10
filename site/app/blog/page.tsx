import type { Metadata } from 'next'

import { SiteHeader } from '@/components/site-header'
import { getAllPosts } from '@/lib/blog'
import { BadgeCheck } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Notes on structured content, LLM-generated Markdown, and validation. Every post is a Content Blocks document rendered by the library.',
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function BlogIndex() {
  const posts = await getAllPosts()
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 pb-20">
        <header className="pt-14 pb-10 sm:pt-20">
          <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">Blog</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Notes on structured content
          </h1>
          <p className="text-muted-foreground mt-4 text-pretty">
            Every post here is a Content Blocks document — written in plain Markdown, validated at
            build time, rendered by the library it talks about.
          </p>
        </header>

        <div className="border-t">
          {posts.map((post) => (
            <article key={post.slug} className="group border-b py-8">
              <Link href={`/blog/${post.slug}`} className="block">
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    valid
                  </span>
                  <span>{post.blockCount} blocks</span>
                  <span>{post.words} words</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-balance group-hover:underline group-hover:underline-offset-4">
                  {post.title}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                  {post.description}
                </p>
              </Link>
            </article>
          ))}
        </div>
      </main>
    </>
  )
}
