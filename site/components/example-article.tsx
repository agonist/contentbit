'use client'

import type { ComponentProps } from 'react'

import { styledComponents } from '@/components/content-blocks/content-renderer'
import { CopyButton } from '@/components/copy-button'
import { EXAMPLE_SOURCE } from '@/lib/example-article'
import { cn } from '@/lib/utils'
import { genericBlocks, genericMarkdownRenderers } from '@content-blocks/blocks'
import {
  createBlockRegistry,
  formatDiagnostic,
  parseDocument,
  renderToMarkdown,
  validateDocument,
} from '@content-blocks/core'
import { ContentBlocks } from '@content-blocks/react'
import { BadgeCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const registry = createBlockRegistry().use(genericBlocks())

/*
 * One renderMarkdown serves both article prose and block bodies, so nothing
 * here sets a font size — each context's container does (the <article> for
 * prose, each block component for its body).
 */
const prose = {
  p: (props: ComponentProps<'p'>) => (
    <p {...props} className="leading-relaxed [&:not(:first-child)]:mt-4" />
  ),
  h2: (props: ComponentProps<'h2'>) => (
    <h2
      {...props}
      className="text-foreground mt-12 mb-4 text-xl font-semibold tracking-tight first:mt-0"
    />
  ),
  h3: (props: ComponentProps<'h3'>) => (
    <h3 {...props} className="text-foreground mt-8 mb-3 text-base font-semibold tracking-tight" />
  ),
  a: (props: ComponentProps<'a'>) => (
    <a
      {...props}
      className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
      target="_blank"
      rel="noreferrer"
    />
  ),
  strong: (props: ComponentProps<'strong'>) => <strong {...props} className="font-semibold" />,
  ul: (props: ComponentProps<'ul'>) => (
    <ul {...props} className="my-4 list-disc space-y-1.5 pl-5" />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol {...props} className="my-4 list-decimal space-y-1.5 pl-5" />
  ),
  code: (props: ComponentProps<'code'>) => (
    <code {...props} className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]" />
  ),
}

function Prose({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={prose}>
      {source}
    </ReactMarkdown>
  )
}

const VIEWS = [
  { id: 'rendered', label: 'Rendered', hint: '@content-blocks/react + styled pack' },
  { id: 'source', label: 'Source', hint: 'what the author wrote — one .md file' },
  { id: 'plain', label: 'Plain Markdown', hint: 'renderToMarkdown() — email, search, AI context' },
] as const

type ViewId = (typeof VIEWS)[number]['id']

export function ExampleArticle() {
  const [view, setView] = useState<ViewId>('rendered')

  const { document, plain, blockCount, words } = useMemo(() => {
    const result = validateDocument(parseDocument(EXAMPLE_SOURCE), registry)
    if (!result.ok) {
      // Fails the static build if the article ever breaks — validation as CI.
      throw new Error(
        `Example article is invalid:\n${result.diagnostics
          .map((d) => formatDiagnostic(d, 'example-article.md'))
          .join('\n')}`,
      )
    }
    return {
      document: result.document,
      plain: renderToMarkdown(result.document, { renderers: genericMarkdownRenderers }),
      blockCount: result.document.children.filter((n) => n.type === 'block').length,
      words: EXAMPLE_SOURCE.split(/\s+/).length,
    }
  }, [])

  const activeHint = VIEWS.find((v) => v.id === view)?.hint

  return (
    <div className="mx-auto max-w-2xl px-6">
      {/* Document meta strip */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 border-y py-3 font-mono text-xs">
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <BadgeCheck className="size-3.5" aria-hidden />
          valid · 0 diagnostics
        </span>
        <span>{blockCount} blocks</span>
        <span>{words} words</span>
        <span className="hidden sm:inline">1 document → 3 targets</span>
        <span className="ml-auto">
          <CopyButton value={EXAMPLE_SOURCE} />
        </span>
      </div>

      {/* View switcher */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Render target"
          className="bg-muted inline-flex w-fit items-center gap-0.5 rounded-lg border p-0.5"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-all active:scale-95',
                view === v.id
                  ? 'bg-background text-foreground border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground font-mono text-[11px]">{activeHint}</p>
      </div>

      {/* The document, through the chosen target */}
      <article className="mt-8 pb-8 text-[15px]">
        {view === 'rendered' ? (
          <ContentBlocks
            document={document}
            components={styledComponents}
            renderMarkdown={(md) => <Prose source={md} />}
          />
        ) : (
          <pre className="bg-card overflow-x-auto rounded-xl border p-5 font-mono text-[12.5px] leading-relaxed shadow-sm">
            <code>
              {(view === 'source' ? EXAMPLE_SOURCE : plain).split('\n').map((line, i) => (
                <span
                  key={i}
                  className={cn(
                    'block',
                    view === 'source' && (line.startsWith(':::') || line.startsWith('::'))
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  {line === '' ? ' ' : line}
                </span>
              ))}
            </code>
          </pre>
        )}
      </article>
    </div>
  )
}
