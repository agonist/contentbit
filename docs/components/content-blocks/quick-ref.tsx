import type { QuickRefData } from '@content-blocks/blocks'
import type { BlockComponentProps } from '@content-blocks/react'

export function QuickRefBlock({ node }: BlockComponentProps) {
  const data = node.data as QuickRefData
  return (
    <dl data-cb-styled className="bg-card my-6 divide-y rounded-lg border">
      {data.rows.map((row, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted-foreground text-sm">{row.key}</dt>
          <dd className="text-sm font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
