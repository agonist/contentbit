'use client'

import { genericBlocks } from '@contentbit/blocks'
import {
  createBlockRegistry,
  formatDiagnostic,
  parseDocument,
  validateDocument,
} from '@contentbit/core'

const BROKEN = `:::comparison{left="Basic"}
- Price | Free
:::`

const registry = createBlockRegistry().use(genericBlocks())

export function ValidationDemo() {
  const result = validateDocument(parseDocument(BROKEN), registry)
  return (
    <div className="bg-card grid overflow-hidden rounded-xl border shadow-sm lg:grid-cols-2">
      <div className="bg-muted/40 border-b lg:border-r lg:border-b-0">
        <div className="text-muted-foreground flex h-9 items-center border-b px-4 font-mono text-xs">
          broken.md
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed">
          <code>{BROKEN}</code>
        </pre>
      </div>
      <div>
        <div className="text-muted-foreground flex h-9 items-center gap-2 border-b px-4 font-mono text-xs">
          contentbit validate broken.md
          <span className="text-destructive ml-auto">exit 1</span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed">
          <code>
            {result.diagnostics.map((d, i) => {
              const [head, ...rest] = formatDiagnostic(d, 'broken.md').split('\n')
              return (
                <span key={i} className="mb-3 block">
                  <span className="text-destructive block">{head}</span>
                  {rest.map((line, j) => (
                    <span key={j} className="text-muted-foreground block">
                      {line}
                    </span>
                  ))}
                </span>
              )
            })}
          </code>
        </pre>
      </div>
    </div>
  )
}
