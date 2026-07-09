import { quickRefBlock } from '@contentbit/blocks'
import { defineBlockComponent } from '@contentbit/react'

export const QuickRefBlock = defineBlockComponent(quickRefBlock, ({ node }) => {
  const data = node.data
  return (
    <dl data-cb-styled className="bg-card my-6 space-y-2.5 rounded-lg border px-4 py-3.5">
      {data.rows.map((row, i) => (
        <div key={i} className="flex items-baseline gap-3">
          <dt className="text-muted-foreground shrink-0 text-sm">{row.key}</dt>
          <span
            className="border-foreground/15 min-w-4 flex-1 self-center border-b border-dotted"
            aria-hidden
          />
          <dd className="text-right text-sm font-medium tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
})
