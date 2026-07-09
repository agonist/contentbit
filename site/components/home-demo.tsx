'use client'

import { styledComponents } from '@contentbit-registry/blocks/content-renderer'
import { Markdown } from '@/components/markdown'
import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { ContentBlocks } from '@contentbit/react'

const SOURCE = `:::key-metrics
- 65% | Hydration
- 24h | Cold ferment
- 250g | Ball weight
- 450°C | Oven temp
:::

:::tabs
::tab{title="Stand mixer"}
Dough hook, speed 2, eight minutes. Stop when the dough **clears the bowl**.
::tab{title="By hand"}
Fold every 30 minutes, four times. Slower, same gluten.
:::

:::comparison{left="Fresh yeast" right="Instant"}
- Amount | 9g | 3g
- Where to buy | Bakeries | Everywhere
- Flavor | Slightly richer | Neutral
:::

:::callout{type="tip" title="Same source, every target"}
This panel is the real React pack. Prose runs through [react-markdown](https://github.com/remarkjs/react-markdown), exactly like your app would wire it.
:::`

const registry = createBlockRegistry().use(genericBlocks())

export function HomeDemo() {
  const result = validateDocument(parseDocument(SOURCE), registry)
  return (
    <div className="bg-card grid overflow-hidden rounded-xl border shadow-sm lg:grid-cols-2">
      <div className="bg-muted/40 relative border-b lg:border-r lg:border-b-0">
        <div className="text-muted-foreground flex h-9 items-center gap-1.5 border-b px-4 font-mono text-xs">
          <span className="size-2 rounded-full bg-red-400/80" />
          <span className="size-2 rounded-full bg-amber-400/80" />
          <span className="size-2 rounded-full bg-emerald-400/80" />
          <span className="ml-2">guide.md</span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed">
          <code>
            {SOURCE.split('\n').map((line, i) => (
              <span
                key={i}
                className={
                  line.startsWith(':::') || line.startsWith('::')
                    ? 'text-foreground block font-medium'
                    : 'text-muted-foreground block'
                }
              >
                {line === '' ? ' ' : line}
              </span>
            ))}
          </code>
        </pre>
      </div>
      <div>
        <div className="text-muted-foreground flex h-9 items-center border-b px-4 font-mono text-xs">
          rendered
        </div>
        <div className="p-4 text-sm [&_[data-cb-styled]]:first:mt-0">
          <ContentBlocks
            document={result.document}
            components={styledComponents}
            renderMarkdown={(md) => <Markdown source={md} />}
          />
        </div>
      </div>
    </div>
  )
}
