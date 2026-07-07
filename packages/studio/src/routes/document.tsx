import { formatSeoBriefMarkdown, type SeoBrief, type SeoPage } from '@contentbit/core'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Braces,
  Check,
  Clipboard,
  Download,
  FileCode2,
  FileJson,
  FileText,
  ListChecks,
  Link2,
  RefreshCw,
  Search,
  Target,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

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

              {document.seoBrief && (
                <Panel title="Brief" icon={<Target className="size-4" />}>
                  <SeoBriefView brief={document.seoBrief} />
                </Panel>
              )}

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
                  {(document.file.keywords.lsi?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">LSI</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {document.file.keywords.lsi?.map((keyword) => (
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

type BriefFormat = 'markdown' | 'json'

function SeoBriefView({ brief }: { brief: SeoBrief }) {
  const [rawFormat, setRawFormat] = useState<BriefFormat>('markdown')
  const [copiedFormat, setCopiedFormat] = useState<BriefFormat | null>(null)
  const markdown = useMemo(() => formatSeoBriefMarkdown(brief), [brief])
  const json = useMemo(() => JSON.stringify(brief, null, 2), [brief])
  const raw = rawFormat === 'markdown' ? markdown : json

  async function copy(format: BriefFormat) {
    const value = format === 'markdown' ? markdown : json
    try {
      await navigator.clipboard.writeText(value)
      setCopiedFormat(format)
      window.setTimeout(() => setCopiedFormat(null), 1400)
    } catch {
      setCopiedFormat(null)
    }
  }

  function download(format: BriefFormat) {
    const value = format === 'markdown' ? markdown : json
    const extension = format === 'markdown' ? 'md' : 'json'
    downloadText(`${briefFilename(brief)}.${extension}`, value)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1">
            <Badge>{brief.target.source}</Badge>
            {brief.target.type && <Badge>{brief.target.type}</Badge>}
            {brief.target.intent && <Badge>{brief.target.intent}</Badge>}
          </div>
          <h3 className="mt-2 break-words text-xl font-semibold">
            {brief.target.title ?? brief.target.key ?? brief.target.slug ?? brief.target.id}
          </h3>
          <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <BriefMeta label="id" value={brief.target.id} />
            <BriefMeta label="key" value={brief.target.key} />
            <BriefMeta label="slug" value={brief.target.slug} />
            <BriefMeta label="primary" value={brief.target.keywords?.primary} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-2 px-2.5 text-xs"
            onClick={() => void copy('markdown')}
          >
            {copiedFormat === 'markdown' ? (
              <Check className="size-3.5" />
            ) : (
              <Clipboard className="size-3.5" />
            )}
            {copiedFormat === 'markdown' ? 'Copied' : 'Copy Markdown'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-2 px-2.5 text-xs"
            onClick={() => void copy('json')}
          >
            {copiedFormat === 'json' ? (
              <Check className="size-3.5" />
            ) : (
              <Clipboard className="size-3.5" />
            )}
            {copiedFormat === 'json' ? 'Copied' : 'Copy JSON'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-2 px-2.5 text-xs"
            onClick={() => download('markdown')}
          >
            <Download className="size-3.5" />
            Markdown
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 gap-2 px-2.5 text-xs"
            onClick={() => download('json')}
          >
            <Download className="size-3.5" />
            JSON
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <KeywordList title="Secondary Keywords" items={brief.target.keywords?.secondary} />
          <KeywordList title="LSI Keywords" items={brief.target.keywords?.lsi} />
          <BriefList
            title="Required Sections"
            items={brief.requiredSections.map((section) => section.headings.join(' / '))}
          />
          <BriefList title="Required Blocks" items={brief.requiredBlocks} />
          <BriefList title="Recommended Blocks" items={brief.recommendedBlocks} />
        </div>
        <div className="space-y-4">
          <BriefList title="Required Links" items={brief.requiredLinksTo} />
          <BriefList
            title="Current Findings"
            items={brief.findings.map((finding) => `${finding.code}: ${finding.message}`)}
          />
          <RelatedPages pages={brief.relatedPages} />
          <BriefList
            title="Acceptance"
            items={brief.acceptanceChecks}
            icon={<ListChecks className="size-4" />}
          />
        </div>
      </div>

      <div className="border">
        <div className="flex flex-col gap-3 border-b bg-muted/40 px-3 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            {rawFormat === 'markdown' ? (
              <FileText className="size-4" />
            ) : (
              <FileJson className="size-4" />
            )}
            {rawFormat === 'markdown' ? 'Markdown' : 'JSON'}
          </div>
          <div className="flex w-fit gap-1 border bg-background p-1">
            {(['markdown', 'json'] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => setRawFormat(format)}
                className={
                  rawFormat === format
                    ? 'bg-foreground px-2.5 py-1.5 text-xs font-medium text-background'
                    : 'px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground'
                }
              >
                {format}
              </button>
            ))}
          </div>
        </div>
        <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words bg-background p-4 font-mono text-xs leading-5">
          {raw}
        </pre>
      </div>
    </div>
  )
}

function BriefMeta({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <span className="mr-2 font-mono uppercase">{label}</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  )
}

function KeywordList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="mb-2 text-xs uppercase text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <Badge key={item}>{item}</Badge>
        ))}
      </div>
    </div>
  )
}

function BriefList({ title, items, icon }: { title: string; items: string[]; icon?: ReactNode }) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase text-muted-foreground">
        {icon}
        <p>{title}</p>
      </div>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item} className="break-words border bg-muted/40 px-2 py-1.5">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function RelatedPages({ pages }: { pages: SeoPage[] }) {
  if (pages.length === 0) return null
  return (
    <div>
      <p className="mb-2 text-xs uppercase text-muted-foreground">Related Pages</p>
      <ul className="space-y-1 text-sm">
        {pages.map((page) => (
          <li key={page.id} className="min-w-0 border bg-muted/40 px-2 py-1.5">
            <p className="break-words font-medium">{pageLabel(page)}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {page.source && <Badge>{page.source}</Badge>}
              {page.type && <Badge>{page.type}</Badge>}
              {page.slug && <Badge>{page.slug}</Badge>}
            </div>
          </li>
        ))}
      </ul>
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

function pageLabel(page: SeoPage): string {
  return page.title ?? page.key ?? page.slug ?? page.id
}

function briefFilename(brief: SeoBrief): string {
  return safeFilename(
    `contentbit-brief-${brief.target.key ?? brief.target.slug ?? brief.target.id}`,
  )
}

function safeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
