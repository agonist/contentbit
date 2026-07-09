'use client'

import { styledComponents } from '@contentbit-registry/blocks/content-renderer'
import { Markdown } from '@/components/markdown'
import { genericBlocks } from '@contentbit/blocks'
import {
  createBlockRegistry,
  formatDiagnostic,
  parseDocument,
  validateDocument,
} from '@contentbit/core'
import { ContentBlocks } from '@contentbit/react'
import posthog from 'posthog-js'
import { useEffect, useMemo, useRef, useState } from 'react'

const registry = createBlockRegistry().use(genericBlocks())

const INITIAL = `## Try it

Regular **Markdown** works everywhere. Prose runs through your own
Markdown library ([react-markdown](https://github.com/remarkjs/react-markdown) here).

:::callout{type="tip" title="Edit me"}
Change anything on the left. Validation runs as you type, and *inline
formatting* renders inside block bodies too.
:::

:::tabs
::tab{title="Fast"}
Use this when **time** matters.
::tab{title="Cheap"}
Use this when **budget** matters.
:::

:::comparison{left="A" right="B"}
- Speed | Fast | Slow
- Cost | $$ | $
:::
`

export default function Playground() {
  const [source, setSource] = useState(INITIAL)
  const result = useMemo(() => validateDocument(parseDocument(source), registry), [source])
  const prevDiagCount = useRef(result.diagnostics.length)
  const hasEdited = useRef(false)

  useEffect(() => {
    const prev = prevDiagCount.current
    const curr = result.diagnostics.length
    if (prev > 0 && curr === 0) {
      posthog.capture('playground_validation_passed', {
        // children mixes prose segments and blocks; count only the blocks.
        block_count: result.document.children.filter((c) => c.type === 'block').length,
      })
    }
    prevDiagCount.current = curr
  }, [result])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setSource(e.target.value)
    if (!hasEdited.current) {
      hasEdited.current = true
      posthog.capture('playground_content_edited')
    }
  }

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-2">
        <textarea
          className="bg-card min-h-0 flex-1 resize-none rounded-lg border p-3 font-mono text-sm shadow-sm"
          value={source}
          onChange={handleChange}
          spellCheck={false}
          aria-label="Markdown source"
        />
        <div className="bg-card max-h-40 overflow-y-auto rounded-lg border p-2 font-mono text-xs shadow-sm">
          {result.diagnostics.length === 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400">✓ no diagnostics</span>
          ) : (
            result.diagnostics.map((d, i) => (
              <div
                key={i}
                className={d.severity === 'error' ? 'text-destructive' : 'text-amber-500'}
              >
                {formatDiagnostic(d, 'playground.md')}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="bg-card min-h-0 overflow-y-auto rounded-lg border p-4 text-sm shadow-sm">
        <ContentBlocks
          document={result.document}
          components={styledComponents}
          renderMarkdown={(md) => <Markdown source={md} />}
        />
      </div>
    </div>
  )
}
