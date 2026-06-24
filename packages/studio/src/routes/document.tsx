import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Braces,
  FileCode2,
  Link2,
  RefreshCw,
  Search,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { fetchDocument } from '@/lib/api'
import type { StudioDocument, StudioFinding } from '@/server/types'

interface DocumentSearch {
  path: string
}

export const Route = createFileRoute('/document')({
  validateSearch: (search: Record<string, unknown>): DocumentSearch => ({
    path: typeof search.path === 'string' ? search.path : '',
  }),
  component: DocumentDetail,
})

function DocumentDetail() {
  const search = Route.useSearch()
  const [document, setDocument] = useState<StudioDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    if (!search.path) {
      setError('Missing document path.')
      return
    }
    setRefreshing(true)
    setError(null)
    try {
      setDocument(await fetchDocument(search.path))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [search.path])

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Button asChild variant="outline" className="w-fit gap-2">
              <Link to="/" search={{ q: '', status: 'all', sort: 'status', dir: 'asc' }}>
                <ArrowLeft className="size-4" />
                Dashboard
              </Link>
            </Button>
            <Button onClick={refresh} disabled={refreshing} className="w-fit gap-2">
              <RefreshCw className={refreshing ? 'size-4 animate-spin' : 'size-4'} />
              Refresh
            </Button>
          </div>

          {document ? (
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                {document.file.relativePath}
              </p>
              <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight">
                {document.file.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge>{document.file.status}</Badge>
                <Badge>{document.file.words} words</Badge>
                <Badge>{document.file.blocks} blocks</Badge>
                <Badge>{document.file.links} links</Badge>
              </div>
            </div>
          ) : (
            <div>
              <p className="font-mono text-xs text-muted-foreground">contentbit studio</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Document detail</h1>
            </div>
          )}
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {error && (
            <Panel title="Error" icon={<AlertTriangle className="size-4" />}>
              {error}
            </Panel>
          )}
          {!document && !error && (
            <Panel title="Loading" icon={<RefreshCw className="size-4" />}>
              Scanning document...
            </Panel>
          )}
          {document && (
            <>
              <Panel title="Preview" icon={<Search className="size-4" />}>
                <div
                  className="studio-preview"
                  dangerouslySetInnerHTML={{ __html: document.previewHtml }}
                />
              </Panel>

              <Panel title="Source" icon={<FileCode2 className="size-4" />}>
                <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap break-words bg-muted p-4 font-mono text-xs leading-5">
                  {document.source}
                </pre>
              </Panel>
            </>
          )}
        </div>

        {document && (
          <aside className="space-y-5">
            <Panel title="Stats" icon={<BarChart3 className="size-4" />}>
              <MetricGrid
                items={[
                  ['words', document.stats.length.words],
                  ['reading', `${document.stats.length.readingMinutes} min`],
                  ['sections', document.stats.outline.length],
                  ['images', document.stats.images.total],
                  ['missing alt', document.stats.images.missingAlt],
                  ['external', document.stats.links.external],
                ]}
              />
            </Panel>

            <Panel title="Links" icon={<Link2 className="size-4" />}>
              <LinkList title="Outgoing" items={document.linksTo} />
              <LinkList title="Backlinks" items={document.linkedFrom} />
            </Panel>

            <Panel title="Keywords" icon={<Braces className="size-4" />}>
              {document.file.keywords ? (
                <div className="space-y-3 text-sm">
                  {document.file.keywords.primary && (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Primary</p>
                      <p className="mt-1 font-medium">{document.file.keywords.primary}</p>
                    </div>
                  )}
                  {(document.file.keywords.secondary?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Secondary</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {document.file.keywords.secondary?.map((keyword) => (
                          <Badge key={keyword}>{keyword}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No keyword frontmatter found.</p>
              )}
            </Panel>

            <Panel title="Findings" icon={<AlertTriangle className="size-4" />}>
              {document.findings.length > 0 ? (
                <ul className="space-y-3">
                  {document.findings.map((finding, index) => (
                    <FindingItem
                      key={`${finding.code}-${finding.line ?? 0}-${index}`}
                      finding={finding}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No findings for this document.</p>
              )}
            </Panel>
          </aside>
        )}
      </section>
    </main>
  )
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="border bg-background">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex border bg-background px-2 py-0.5 text-xs">{children}</span>
}

function MetricGrid({ items }: { items: Array<[string, number | string]> }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden border bg-border">
      {items.map(([label, value]) => (
        <div key={label} className="bg-background p-3">
          <div className="font-mono text-lg font-semibold">{value}</div>
          <div className="text-[0.65rem] uppercase text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  )
}

function LinkList({ title, items }: { title: string; items: StudioDocument['linksTo'] }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs uppercase text-muted-foreground">{title}</p>
      {items.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {items.map((item, index) => (
            <li
              key={`${linkLabel(item)}-${index}`}
              className="truncate border bg-muted/40 px-2 py-1"
            >
              {linkLabel(item)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None</p>
      )}
    </div>
  )
}

function FindingItem({ finding }: { finding: StudioFinding }) {
  const tone =
    finding.severity === 'error'
      ? 'text-destructive'
      : finding.severity === 'warning'
        ? 'text-amber-700'
        : 'text-blue-700'
  return (
    <li className="border bg-muted/30 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <span className={`font-medium ${tone}`}>{finding.code}</span>
        {finding.line && (
          <span className="font-mono text-xs text-muted-foreground">:{finding.line}</span>
        )}
      </div>
      <p className="mt-1">{finding.message}</p>
      {finding.hint && <p className="mt-2 text-xs text-muted-foreground">{finding.hint}</p>}
    </li>
  )
}

function linkLabel(item: StudioDocument['linksTo'][number]): string {
  if (typeof item === 'string') return item
  return item.target ?? item.key ?? item.slug
}
