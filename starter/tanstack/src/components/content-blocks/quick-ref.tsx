import type { QuickRefData } from '@contentbit/blocks'
import type { BlockComponentProps } from '@contentbit/react'

export function QuickRefBlock({ node }: BlockComponentProps) {
  const data = node.data as QuickRefData
  return (
    <dl data-cb-styled className="my-6 space-y-2.5 rounded-lg border bg-card px-4 py-3.5">
      {data.rows.map((row, i) => (
        <div key={i} className="flex items-baseline gap-3">
          <dt className="shrink-0 text-sm text-muted-foreground">{row.key}</dt>
          <span
            className="min-w-4 flex-1 self-center border-b border-dotted border-foreground/15"
            aria-hidden
          />
          <dd className="text-right text-sm font-medium tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
