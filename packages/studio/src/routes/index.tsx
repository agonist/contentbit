import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  Blocks,
  FileText,
  Filter,
  Link2,
  RefreshCw,
  Search,
  ChevronsUpDown,
  Target,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { fetchGraph, fetchProject } from '@/lib/api'
import type { StudioFileSummary, StudioGraph, StudioProject, StudioStatus } from '@/server/types'

type StatusFilter = 'all' | StudioStatus
type SortKey = 'document' | 'status' | 'blocks' | 'keywords' | 'findings'
type SortDir = 'asc' | 'desc'

interface DashboardSearch {
  q: string
  status: StatusFilter
  sort: SortKey
  dir: SortDir
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    q: typeof search.q === 'string' ? search.q : '',
    status: isStatus(search.status) ? search.status : 'all',
    sort: isSortKey(search.sort) ? search.sort : 'status',
    dir: search.dir === 'asc' || search.dir === 'desc' ? search.dir : 'asc',
  }),
  component: Dashboard,
})

function Dashboard() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const [project, setProject] = useState<StudioProject | null>(null)
  const [graph, setGraph] = useState<StudioGraph | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    setError(null)
    try {
      const [project, graph] = await Promise.all([fetchProject(), fetchGraph()])
      setProject(project)
      setGraph(graph)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const files = useMemo(() => {
    if (!project) return []
    const query = search.q.toLowerCase().trim()
    return project.files
      .filter((file) => {
        const haystack = [
          file.relativePath,
          file.title,
          file.slug,
          file.key,
          file.locale,
          file.keywords?.primary,
          ...(file.keywords?.secondary ?? []),
          ...(file.keywords?.lsi ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return (
          (search.status === 'all' || file.status === search.status) && haystack.includes(query)
        )
      })
      .sort((a, b) => compareFiles(a, b, search.sort, search.dir))
  }, [project, search.dir, search.q, search.sort, search.status])

  function setSearch(next: Partial<DashboardSearch>) {
    void navigate({ to: '/', search: (prev) => ({ ...prev, ...next }) })
  }

  function setSort(sort: SortKey) {
    setSearch({ sort, dir: search.sort === sort && search.dir === 'asc' ? 'desc' : 'asc' })
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="border-b bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase text-muted-foreground">contentbit studio</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Content dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Read-only view of content health, structure, links, keywords, and previews.
              </p>
            </div>
            <Button onClick={refresh} disabled={refreshing} className="w-fit gap-2">
              <RefreshCw className={refreshing ? 'size-4 animate-spin' : 'size-4'} />
              Refresh
            </Button>
          </div>

          {project && (
            <div className="grid gap-px overflow-hidden rounded-sm border bg-border md:grid-cols-4">
              <Metric
                label="files"
                value={project.summary.files}
                icon={<FileText className="size-4" />}
              />
              <Metric
                label="findings"
                value={
                  project.summary.errors + project.summary.warnings + project.summary.suggestions
                }
                icon={<AlertTriangle className="size-4" />}
                tone={
                  project.summary.errors > 0 ? 'bad' : project.summary.warnings > 0 ? 'warn' : 'ok'
                }
              />
              <Metric
                label="blocks"
                value={project.summary.blocks}
                icon={<Blocks className="size-4" />}
              />
              <Metric
                label="graph"
                value={
                  project.linkGraph
                    ? `${project.linkGraph.pages}/${project.linkGraph.links}`
                    : 'off'
                }
                icon={<Link2 className="size-4" />}
              />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 md:flex-row">
            <label className="relative flex min-w-0 flex-1 items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
              <input
                value={search.q}
                onChange={(event) => setSearch({ q: event.target.value })}
                placeholder="Search path, title, slug, keyword..."
                className="h-10 w-full border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-foreground"
              />
            </label>
            <div className="flex items-center gap-1 border bg-background p-1">
              <Filter className="mx-2 size-4 text-muted-foreground" />
              {(['all', 'error', 'warning', 'suggestion', 'healthy'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setSearch({ status })}
                  className={
                    search.status === status
                      ? 'bg-foreground px-2.5 py-1.5 text-xs font-medium text-background'
                      : 'px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground'
                  }
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden border">
            <div className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr_2rem] gap-px border-b bg-border text-xs font-medium uppercase text-muted-foreground">
              <SortHeader
                label="Document"
                active={search.sort === 'document'}
                onClick={() => setSort('document')}
              />
              <SortHeader
                label="Status"
                active={search.sort === 'status'}
                onClick={() => setSort('status')}
              />
              <SortHeader
                label="Blocks"
                active={search.sort === 'blocks'}
                onClick={() => setSort('blocks')}
              />
              <SortHeader
                label="Keywords"
                active={search.sort === 'keywords'}
                onClick={() => setSort('keywords')}
              />
              <div className="bg-muted/50 px-2 py-2" />
            </div>
            {error ? (
              <div className="p-4 text-sm text-destructive">{error}</div>
            ) : project ? (
              <div className="divide-y">
                {files.map((file) => (
                  <FileRow key={file.path} file={file} />
                ))}
                {files.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">
                    No documents match the current filters.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">Scanning content...</div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          {project?.seo && (
            <Panel title="SEO">
              <div className="grid grid-cols-3 gap-px overflow-hidden border bg-border text-center">
                <TinyMetric value={project.seo.pages} label="pages" />
                <TinyMetric value={project.seo.planned} label="planned" />
                <TinyMetric value={project.seo.findings} label="findings" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="size-4" />
                <span>{project.seo.schemaVersion}</span>
              </div>
            </Panel>
          )}

          <Panel title="Link graph">
            {project?.linkGraph ? (
              <div className="grid grid-cols-3 gap-px overflow-hidden border bg-border text-center">
                <TinyMetric value={project.linkGraph.pages} label="pages" />
                <TinyMetric value={project.linkGraph.links} label="links" />
                <TinyMetric value={project.linkGraph.orphans} label="orphans" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No slug frontmatter detected.</p>
            )}
            {graph && graph.edges.length > 0 && (
              <ul className="mt-3 flex max-h-56 flex-col gap-2 overflow-auto text-xs">
                {graph.edges.slice(0, 12).map((edge, index) => (
                  <li
                    key={`${edge.from}-${edge.target}-${index}`}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={
                        edge.status === 'unresolved' ? 'text-destructive' : 'text-muted-foreground'
                      }
                    >
                      {edge.status}
                    </span>
                    <span className="truncate">{edge.target}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Block usage">
            {project && Object.keys(project.blockUsage).length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {Object.entries(project.blockUsage).map(([name, count]) => (
                  <span key={name} className="border bg-muted px-2 py-1 font-mono text-xs">
                    {name} x{count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No blocks found yet.</p>
            )}
          </Panel>

          <Panel title="Keyword coverage">
            {project && (
              <div className="space-y-2 text-sm">
                <Coverage
                  label="primary"
                  value={project.keywordCoverage.withPrimary}
                  total={project.keywordCoverage.total}
                />
                <Coverage
                  label="secondary"
                  value={project.keywordCoverage.withSecondary}
                  total={project.keywordCoverage.total}
                />
              </div>
            )}
          </Panel>
        </aside>
      </section>
    </main>
  )
}

function FileRow({ file }: { file: StudioFileSummary }) {
  return (
    <Link
      to="/document"
      search={{ path: file.path }}
      className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr_2rem] gap-px bg-border text-sm transition-colors hover:bg-foreground/20"
    >
      <div className="min-w-0 bg-background px-3 py-3">
        <p className="truncate font-medium">{file.title}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{file.relativePath}</p>
      </div>
      <div className="bg-background px-3 py-3">
        <StatusBadge status={file.status} />
      </div>
      <div className="bg-background px-3 py-3 font-mono text-xs">{file.blocks}</div>
      <div className="bg-background px-3 py-3 text-xs text-muted-foreground">
        {file.keywords?.primary ? 'primary' : 'missing'}
      </div>
      <div className="flex items-center justify-center bg-background px-2 py-3">
        <ArrowRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  )
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number | string
  icon: ReactNode
  tone?: 'bad' | 'warn' | 'ok'
}) {
  const color =
    tone === 'bad'
      ? 'text-destructive'
      : tone === 'warn'
        ? 'text-amber-600'
        : tone === 'ok'
          ? 'text-emerald-600'
          : 'text-foreground'
  return (
    <div className="bg-background p-4">
      <div className="mb-3 flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase">{label}</span>
        {icon}
      </div>
      <div className={`font-mono text-3xl font-semibold ${color}`}>{value}</div>
    </div>
  )
}

function TinyMetric({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bg-background px-2 py-2">
      <div className="font-mono text-lg font-semibold">{value}</div>
      <div className="text-[0.65rem] uppercase text-muted-foreground">{label}</div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border bg-background p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Coverage({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-2 bg-muted">
        <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: StudioStatus }) {
  const cls =
    status === 'error'
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : status === 'warning'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-700'
        : status === 'suggestion'
          ? 'border-blue-500/40 bg-blue-500/10 text-blue-700'
          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
  return <span className={`inline-flex border px-2 py-0.5 text-xs ${cls}`}>{status}</span>
}

function isStatus(value: unknown): value is StatusFilter {
  return (
    value === 'all' ||
    value === 'error' ||
    value === 'warning' ||
    value === 'suggestion' ||
    value === 'healthy'
  )
}

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick(): void
}) {
  return (
    <button
      className={
        active
          ? 'flex items-center gap-1 bg-muted px-3 py-2 text-foreground'
          : 'flex items-center gap-1 bg-muted/50 px-3 py-2 hover:text-foreground'
      }
      onClick={onClick}
    >
      {label}
      <ChevronsUpDown className="size-3" />
    </button>
  )
}

function compareFiles(a: StudioFileSummary, b: StudioFileSummary, sort: SortKey, dir: SortDir) {
  const direction = dir === 'asc' ? 1 : -1
  const statusOrder: Record<StudioStatus, number> = {
    error: 0,
    warning: 1,
    suggestion: 2,
    healthy: 3,
  }
  const result =
    sort === 'status'
      ? statusOrder[a.status] - statusOrder[b.status]
      : sort === 'blocks'
        ? a.blocks - b.blocks
        : sort === 'keywords'
          ? keywordScore(a) - keywordScore(b)
          : sort === 'findings'
            ? findingScore(a) - findingScore(b)
            : a.relativePath.localeCompare(b.relativePath)
  return (result || a.relativePath.localeCompare(b.relativePath)) * direction
}

function keywordScore(file: StudioFileSummary): number {
  return (
    (file.keywords?.primary ? 1 : 0) +
    (file.keywords?.secondary?.length ? 1 : 0) +
    (file.keywords?.lsi?.length ? 1 : 0)
  )
}

function findingScore(file: StudioFileSummary): number {
  return file.findings.errors * 100 + file.findings.warnings * 10 + file.findings.suggestions
}

function isSortKey(value: unknown): value is SortKey {
  return (
    value === 'document' ||
    value === 'status' ||
    value === 'blocks' ||
    value === 'keywords' ||
    value === 'findings'
  )
}
