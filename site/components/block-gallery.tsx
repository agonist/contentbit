'use client'

import { styledComponents } from '@/components/content-blocks/content-renderer'
import { Markdown } from '@/components/markdown'
import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { ContentBlocks } from '@contentbit/react'
import { Check, X } from 'lucide-react'
import posthog from 'posthog-js'
import { useMemo } from 'react'

const registry = createBlockRegistry().use(genericBlocks())
const blocks = registry.all().filter((def) => !def.childOnly)

function GuidanceList({
  heading,
  items,
  tone,
}: {
  heading: string
  items: string[]
  tone: 'use' | 'avoid'
}) {
  const Icon = tone === 'use' ? Check : X
  const mark =
    tone === 'use' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
  return (
    <div className="mt-5">
      <h3 className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
        {heading}
      </h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm">
            <Icon className={`mt-1 size-3.5 shrink-0 ${mark}`} aria-hidden />
            <span className="text-muted-foreground leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BlockSection({ def }: { def: (typeof blocks)[number] }) {
  const result = useMemo(
    () => validateDocument(parseDocument(`${def.authoring.example}\n`), registry),
    [def],
  )
  return (
    <section id={def.name} className="scroll-mt-24 border-t py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-mono text-xl font-semibold tracking-tight">:::{def.name}</h2>
            {def.interactive ? (
              <span className="text-muted-foreground border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase">
                interactive
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{def.description}</p>
          <GuidanceList heading="Use when" items={def.authoring.useWhen} tone="use" />
          <GuidanceList heading="Avoid when" items={def.authoring.avoidWhen ?? []} tone="avoid" />
        </div>
        <div className="bg-card self-start border">
          <div className="text-muted-foreground flex h-9 items-center border-b px-4 font-mono text-xs">
            example.md
          </div>
          <pre className="bg-muted/40 overflow-x-auto border-b p-4 font-mono text-[12.5px] leading-relaxed">
            <code>
              {def.authoring.example.split('\n').map((line, i) => (
                <span
                  key={i}
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
          <div className="text-muted-foreground flex h-9 items-center border-b px-4 font-mono text-xs">
            rendered
          </div>
          <div className="p-4 text-sm [&_[data-cb-styled]]:my-0">
            <ContentBlocks
              document={result.document}
              components={styledComponents}
              renderMarkdown={(md) => <Markdown source={md} />}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export function BlockGallery() {
  return (
    <>
      {/* Anchor index */}
      <nav aria-label="Blocks" className="flex flex-wrap gap-2">
        {blocks.map((def) => (
          <a
            key={def.name}
            href={`#${def.name}`}
            className="bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30 border px-2.5 py-1 font-mono text-xs transition-colors"
            onClick={() => posthog.capture('block_anchor_clicked', { block_name: def.name })}
          >
            :::{def.name}
          </a>
        ))}
      </nav>

      <div className="mt-12">
        {blocks.map((def) => (
          <BlockSection key={def.name} def={def} />
        ))}
      </div>
    </>
  )
}
