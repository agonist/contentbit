import type { KeyMetricsData } from '@content-blocks/blocks'
import type { BlockComponentProps } from '@content-blocks/react'

export function KeyMetricsBlock({ node }: BlockComponentProps) {
  const data = node.data as KeyMetricsData
  return (
    <div data-cb-styled className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {data.rows.map((row, i) => (
        <div key={i} className="bg-card rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold tracking-tight">{row.value}</div>
          <div className="text-muted-foreground mt-1 text-xs">{row.label}</div>
        </div>
      ))}
    </div>
  )
}
