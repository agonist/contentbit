'use client'

import { genericBlocks } from '@contentbit/blocks'
import {
  createBlockRegistry,
  formatDiagnostic,
  parseDocument,
  validateDocument,
} from '@contentbit/core'
import { useMemo } from 'react'

import { styledComponents } from '@contentbit-registry/blocks/content-renderer'
import { ContentBlocks } from '@contentbit/react'
import { Markdown } from './markdown'

/*
 * Dogfooding component. Given Content Blocks source, it runs the real library
 * pipeline — parseDocument → validateDocument → <ContentBlocks> — and shows the
 * source next to its live rendered output using the styled pack installed via
 * `shadcn add @contentbit/generic-pack`. The docs prove the library by
 * using it, not by describing it.
 */

const registry = createBlockRegistry().use(genericBlocks())

export interface LiveProps {
  /** Content Blocks source. Pass as a template-literal child or the `code` prop. */
  children?: string
  code?: string
  /** Caption above the source pane, e.g. a filename. */
  title?: string
  /** `stack` puts the panes one above the other — for tall examples. */
  layout?: 'split' | 'stack'
}

export function Live({ children, code, title = 'source', layout = 'split' }: LiveProps) {
  const source = (code ?? (typeof children === 'string' ? children : '')).replace(/^\n+|\n+$/g, '')

  const result = useMemo(() => validateDocument(parseDocument(`${source}\n`), registry), [source])
  const errors = result.diagnostics.filter((d) => d.severity === 'error')

  return (
    <div
      className={`not-prose my-6 grid gap-px overflow-hidden rounded-lg border bg-border ${layout === 'split' ? 'md:grid-cols-2' : ''}`}
    >
      <figure className="m-0 flex flex-col bg-card">
        <figcaption className="border-b px-3 py-1.5 font-mono text-xs text-muted-foreground">
          {title}
        </figcaption>
        <pre className="m-0 overflow-x-auto rounded-none bg-transparent p-3 text-[0.8rem] leading-relaxed">
          <code>{source}</code>
        </pre>
      </figure>

      <figure className="m-0 flex flex-col bg-background">
        <figcaption className="border-b px-3 py-1.5 font-mono text-xs text-muted-foreground">
          rendered
        </figcaption>
        <div className="p-4 text-sm">
          {errors.length > 0 ? (
            <pre className="m-0 overflow-x-auto rounded-md bg-muted p-3 text-[0.78rem] leading-relaxed text-destructive">
              <code>{errors.map((d) => formatDiagnostic(d, 'example.md')).join('\n')}</code>
            </pre>
          ) : (
            <ContentBlocks
              document={result.document}
              components={styledComponents}
              renderMarkdown={(md) => <Markdown source={md} />}
            />
          )}
        </div>
      </figure>
    </div>
  )
}
