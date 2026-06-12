'use client'

import { genericBlocks } from '@contentbit/blocks'
import {
  analyzeDocument,
  createBlockRegistry,
  parseDocument,
  stripFrontmatter,
  validateDocument,
} from '@contentbit/core'
import { useMemo, useState } from 'react'

/*
 * Live companion for `contentbit stats`. Runs the same pipeline as the CLI's
 * fileStats(): analyzeDocument over the raw source, plus a validation summary
 * from validateDocument(parseDocument(stripFrontmatter(source))). Edit the
 * source, watch the report change.
 */

const registry = createBlockRegistry().use(genericBlocks())

export interface StatsLiveProps {
  /** Content Blocks source. Pass as a template-literal child or the `code` prop. */
  children?: string
  code?: string
  /** Render a static source pane instead of a textarea. */
  editable?: boolean
  /** Editor min-height. */
  height?: string
}

export function StatsLive({ children, code, editable = true, height = '18rem' }: StatsLiveProps) {
  const initial = (code ?? (typeof children === 'string' ? children : '')).replace(/^\n+|\n+$/g, '')
  const [source, setSource] = useState(initial)

  const { stats, errors, warnings } = useMemo(() => {
    const stats = analyzeDocument(source)
    const result = validateDocument(parseDocument(stripFrontmatter(source)), registry)
    let errors = 0
    let warnings = 0
    for (const d of result.diagnostics) {
      if (d.severity === 'error') errors++
      else warnings++
    }
    return { stats, errors, warnings }
  }, [source])

  return (
    <div className="not-prose my-6 grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-2">
      <figure className="m-0 flex flex-col bg-card">
        <figcaption className="border-b px-3 py-1.5 font-mono text-xs text-muted-foreground">
          source
        </figcaption>
        {editable ? (
          <textarea
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[0.8rem] leading-relaxed outline-none"
            style={{ minHeight: height }}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            aria-label="Markdown source"
          />
        ) : (
          <pre className="m-0 overflow-x-auto rounded-none bg-transparent p-3 text-[0.8rem] leading-relaxed">
            <code>{source}</code>
          </pre>
        )}
      </figure>

      <figure className="m-0 flex flex-col bg-background">
        <figcaption className="flex items-center gap-2 border-b px-3 py-1.5 font-mono text-xs text-muted-foreground">
          contentbit stats
          <span className="ml-auto text-emerald-600 dark:text-emerald-400">exit 0</span>
        </figcaption>
        <div className="flex flex-col gap-3 p-3 font-mono text-xs">
          <div className="grid grid-cols-4 gap-px overflow-hidden border bg-border">
            <SummaryTile value={stats.length.words} label="words" />
            <SummaryTile value={stats.length.readingMinutes} label="read min" />
            <SummaryTile value={`~${stats.length.approxTokens}`} label="tokens" />
            <SummaryTile value={stats.file.lines} label="lines" />
          </div>

          <div>
            {errors === 0 && warnings === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">✓ valid</span>
            ) : (
              <span>
                {errors > 0 && (
                  <span className="text-destructive">
                    {errors} error{errors === 1 ? '' : 's'}
                  </span>
                )}
                {errors > 0 && warnings > 0 && <span className="text-muted-foreground"> · </span>}
                {warnings > 0 && (
                  <span className="text-amber-500">
                    {warnings} warning{warnings === 1 ? '' : 's'}
                  </span>
                )}
              </span>
            )}
          </div>

          <section aria-label="Heading outline">
            <h4 className="mb-1 text-muted-foreground">outline</h4>
            {stats.outline.length === 0 ? (
              <p className="text-muted-foreground/70">no headings</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {stats.outline.map((entry, i) => (
                  <li
                    key={`${entry.line}-${i}`}
                    className="flex items-baseline gap-2"
                    style={{ paddingLeft: (entry.level - 1) * 12 }}
                  >
                    <span className="truncate">{entry.text}</span>
                    <span className="ml-auto text-muted-foreground tabular-nums">
                      {entry.words}w
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Block usage">
            <h4 className="mb-1 text-muted-foreground">blocks</h4>
            {stats.blocks.total === 0 ? (
              <p className="text-muted-foreground/70">none</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {Object.entries(stats.blocks.byName).map(([name, count]) => (
                  <span key={name} className="border bg-muted px-1.5 py-0.5">
                    {name} ×{count}
                  </span>
                ))}
              </div>
            )}
          </section>

          {stats.links.total > 0 && (
            <section aria-label="Links">
              <h4 className="mb-1 text-muted-foreground">
                links · {stats.links.external} external / {stats.links.internal} internal
              </h4>
              {stats.links.domains.length > 0 && (
                <p className="m-0 text-muted-foreground/80">{stats.links.domains.join(', ')}</p>
              )}
            </section>
          )}
        </div>
      </figure>
    </div>
  )
}

function SummaryTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col bg-card px-2 py-1.5">
      <span className="text-sm font-medium text-foreground tabular-nums">{value}</span>
      <span className="text-[0.65rem] text-muted-foreground">{label}</span>
    </div>
  )
}
