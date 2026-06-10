import type { ComparisonData } from '@content-blocks/blocks'
import type { BlockComponentProps } from '@content-blocks/react'

export function ComparisonBlock({ node }: BlockComponentProps) {
  const data = node.data as ComparisonData
  return (
    <div data-cb-styled className="my-6 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th scope="col" className="px-4 py-2.5 text-left font-medium" />
            <th scope="col" className="px-4 py-2.5 text-left font-semibold">
              {String(node.props.left)}
            </th>
            <th scope="col" className="px-4 py-2.5 text-left font-semibold">
              {String(node.props.right)}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.rows.map((row, i) => (
            <tr key={i}>
              <th scope="row" className="text-muted-foreground px-4 py-2.5 text-left font-medium">
                {row.label}
              </th>
              <td className="px-4 py-2.5">{row.left}</td>
              <td className="px-4 py-2.5">{row.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
