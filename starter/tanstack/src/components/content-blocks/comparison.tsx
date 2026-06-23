import type { ComparisonData } from '@contentbit/blocks'
import type { BlockComponentProps } from '@contentbit/react'

export function ComparisonBlock({ node }: BlockComponentProps) {
  const data = node.data as ComparisonData
  return (
    <div data-cb-styled className="my-6 overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th scope="col" className="w-[28%] px-4 py-3 text-left font-medium" />
            <th scope="col" className="px-4 py-3 text-left">
              <span className="font-semibold">{String(node.props.left)}</span>
            </th>
            <th scope="col" className="px-4 py-3 text-left">
              <span className="font-semibold">{String(node.props.right)}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.rows.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-muted/30">
              <th
                scope="row"
                className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground"
              >
                {row.label}
              </th>
              <td className="px-4 py-3 tabular-nums">{row.left}</td>
              <td className="px-4 py-3 tabular-nums">{row.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
