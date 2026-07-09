'use client'

import { styledComponents } from '@contentbit-registry/blocks/content-renderer'
import { cn } from '@/lib/utils'
import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { ContentBlocks } from '@contentbit/react'
import { useMemo, useState } from 'react'

const registry = createBlockRegistry().use(genericBlocks())
const blocks = registry.all().filter((def) => !def.childOnly)

export function BlockShowcase() {
  const [activeName, setActiveName] = useState(blocks[0].name)
  const active = blocks.find((def) => def.name === activeName) ?? blocks[0]
  const result = useMemo(
    () => validateDocument(parseDocument(`${active.authoring.example}\n`), registry),
    [active],
  )

  return (
    <div className="bg-card grid overflow-hidden rounded-xl border shadow-sm lg:grid-cols-[230px_1fr]">
      {/* Block picker */}
      <div className="flex gap-1 overflow-x-auto border-b p-2 lg:flex-col lg:border-r lg:border-b-0 lg:p-3">
        {blocks.map((def) => (
          <button
            key={def.name}
            type="button"
            onClick={() => setActiveName(def.name)}
            aria-pressed={def.name === activeName}
            className={cn(
              'shrink-0 rounded-md px-3 py-2 text-left font-mono text-xs whitespace-nowrap transition-all active:scale-95',
              def.name === activeName
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            :::{def.name}
            {def.interactive ? (
              <span
                className={cn(
                  'ml-2 hidden text-[10px] lg:inline',
                  def.name === activeName
                    ? 'text-primary-foreground/60'
                    : 'text-muted-foreground/60',
                )}
              >
                interactive
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2">
        {/* Authoring example */}
        <div className="bg-muted/40 flex flex-col border-b lg:border-r lg:border-b-0">
          <div className="text-muted-foreground flex h-9 shrink-0 items-center gap-2 border-b px-4 font-mono text-xs">
            authoring example
            <span className="text-muted-foreground/60 ml-auto hidden sm:inline">
              from the registry
            </span>
          </div>
          <pre
            key={active.name}
            className="animate-in fade-in slide-in-from-bottom-1 flex-1 overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed duration-300"
          >
            <code>
              {active.authoring.example.split('\n').map((line, i) => (
                <span
                  key={`${active.name}-${i}`}
                  className={
                    line.startsWith(':::') || line.startsWith('::')
                      ? 'text-foreground block font-medium'
                      : 'text-muted-foreground block'
                  }
                >
                  {line === '' ? ' ' : line}
                </span>
              ))}
            </code>
          </pre>
          <p className="text-muted-foreground border-t px-4 py-2.5 text-xs">
            <span className="text-foreground font-medium">Use when:</span>{' '}
            {active.authoring.useWhen[0]}
          </p>
        </div>

        {/* Live render */}
        <div className="flex flex-col">
          <div className="text-muted-foreground flex h-9 shrink-0 items-center border-b px-4 font-mono text-xs">
            rendered
          </div>
          <div
            key={active.name}
            className="animate-in fade-in slide-in-from-bottom-1 flex-1 p-4 text-sm duration-300 [&_[data-cb-styled]]:my-0"
          >
            <ContentBlocks document={result.document} components={styledComponents} />
          </div>
          <p className="text-muted-foreground border-t px-4 py-2.5 text-xs">{active.description}</p>
        </div>
      </div>
    </div>
  )
}
