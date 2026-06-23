import { createFileRoute } from '@tanstack/react-router'

import { articles, targetsFor, titleFor } from '@/lib/blog'

export const Route = createFileRoute('/blog/')({ component: BlogIndexPage })

function BlogIndexPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          Internal linking demo
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Blog</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Three Markdown articles form a small content graph with <code>slug</code>,{' '}
          <code>linksTo</code>, <code>aliases</code>, and <code>keywords</code> frontmatter.
        </p>
      </div>

      <div className="grid gap-3">
        {articles.map((article) => (
          <a
            key={article.meta.slug}
            href={`/blog/${article.meta.slug}`}
            className="rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted"
          >
            <span className="block font-medium">{article.meta.title}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Links to {targetsFor(article).map(titleFor).join(', ')}
            </span>
          </a>
        ))}
      </div>
    </main>
  )
}
