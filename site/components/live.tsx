'use client'

import { genericBlocks } from '@content-blocks/blocks'
import {
  createBlockRegistry,
  formatDiagnostic,
  parseDocument,
  validateDocument,
} from '@content-blocks/core'
import { useMemo } from 'react'

import { styledComponents } from './content-blocks/content-renderer'
import { ContentBlocks } from '@content-blocks/react'
import { Markdown } from './markdown'

/*
 * Dogfooding component. Given Content Blocks source, it runs the real library
 * pipeline — parseDocument → validateDocument → <ContentBlocks> — and shows the
 * source next to its live rendered output using the styled pack installed via
 * `shadcn add @content-blocks/generic-pack`. The docs prove the library by
 * using it, not by describing it.
 */

const registry = createBlockRegistry().use(genericBlocks())

export interface LiveProps {
  /** Content Blocks source. Pass as a template-literal child or the `code` prop. */
  children?: string
  code?: string
}

export function Live({ children, code }: LiveProps) {
  const source = (code ?? (typeof children === 'string' ? children : '')).replace(/^\n+|\n+$/g, '')

  const result = useMemo(() => validateDocument(parseDocument(`${source}\n`), registry), [source])
  const errors = result.diagnostics.filter((d) => d.severity === 'error')

  return (
    <div className="not-prose my-6 grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-2">
      <figure className="m-0 flex flex-col bg-card">
        <figcaption className="border-b px-3 py-1.5 font-mono text-xs text-muted-foreground">
          source
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
