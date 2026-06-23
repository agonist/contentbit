import { createFileRoute } from '@tanstack/react-router'

import { Content } from '@/components/content-blocks'
import {
  articleBySlug,
  blockCount,
  keywordCount,
  linkedFromFor,
  targetsFor,
  titleFor,
  wordCount,
} from '@/lib/blog'

export const Route = createFileRoute('/blog/$slug')({ component: BlogArticlePage })

function BlogArticlePage() {
  const { slug } = Route.useParams()
  const article = articleBySlug(slug)

  if (!article) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <a href="/blog" className="text-xs text-muted-foreground hover:text-foreground">
          Blog
        </a>
        <h1 className="mt-6 text-2xl font-semibold">Article not found</h1>
      </main>
    )
  }

  const outgoingLinks = targetsFor(article)
  const incomingLinks = linkedFromFor(article.meta.slug)
  const metadataStats = [
    { label: 'Words', value: wordCount(article) },
    { label: 'Blocks', value: blockCount(article) },
    { label: 'Links', value: outgoingLinks.length },
    { label: 'Backlinks', value: incomingLinks.length },
  ]
  const keywordTags = [
    article.meta.keywords?.primary,
    ...(article.meta.keywords?.secondary ?? []),
  ].filter(Boolean)

  return (
    <>
      <div className="border-b border-border/60">
        <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <a
            href="/blog"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </a>
          <a
            href="https://contentbit.dev"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            built with contentbit
          </a>
        </header>
      </div>

      <main className="article mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[0.7rem] tracking-wider text-muted-foreground uppercase">
                Contentbit metadata
              </p>
              <p className="mt-1 text-sm font-medium">{article.meta.slug}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {metadataStats.map((stat) => (
                <div key={stat.label} className="rounded-md bg-muted px-2 py-1.5">
                  <div className="text-sm font-semibold text-foreground">{stat.value}</div>
                  <div className="text-[0.65rem] text-muted-foreground uppercase">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">Links to:</span>{' '}
              {outgoingLinks.map((target, index) => (
                <span key={target}>
                  {index > 0 ? ', ' : null}
                  <a href={`/blog/${target}`}>{titleFor(target)}</a>
                </span>
              ))}
            </p>
            <p>
              <span className="font-medium text-foreground">Linked from:</span>{' '}
              {incomingLinks.map((source, index) => (
                <span key={source}>
                  {index > 0 ? ', ' : null}
                  <a href={`/blog/${source}`}>{titleFor(source)}</a>
                </span>
              ))}
            </p>
            <p>
              <span className="font-medium text-foreground">Aliases:</span>{' '}
              {article.meta.aliases?.join(', ') ?? 'None'}
            </p>
            <p>
              <span className="font-medium text-foreground">Keywords:</span> {keywordCount(article)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {keywordTags.map((keyword) => (
              <span
                key={keyword}
                className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
        <Content source={article.source} />
      </main>
    </>
  )
}
