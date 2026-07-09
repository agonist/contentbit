import { comparisonBlock } from '@contentbit/blocks'
import { defineBlockComponent } from '@contentbit/react'

export const ComparisonBlock = defineBlockComponent(comparisonBlock, ({ node }) => {
  const data = node.data
  return (
    <div data-cb-styled className="bg-card my-6 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th scope="col" className="w-[28%] px-4 py-3 text-left font-medium" />
            <th scope="col" className="px-4 py-3 text-left">
              <span className="font-semibold">{node.props.left}</span>
            </th>
            <th scope="col" className="px-4 py-3 text-left">
              <span className="font-semibold">{node.props.right}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.rows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/30 transition-colors">
              <th
                scope="row"
                className="text-muted-foreground px-4 py-3 text-left text-[13px] font-medium"
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
})
