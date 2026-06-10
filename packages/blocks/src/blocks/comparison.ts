import {
  defineBlock,
  pipeRows,
  type MarkdownBlockRenderer,
  type PipeRowsData,
} from '@content-blocks/core'
import { z } from 'zod'

export type ComparisonData = PipeRowsData

export const comparisonBlock = defineBlock<ComparisonData>({
  name: 'comparison',
  description: 'Side-by-side comparison of exactly two options.',
  props: z.object({
    left: z.string().min(1),
    right: z.string().min(1),
  }),
  content: pipeRows({ columns: ['label', 'left', 'right'], minRows: 2, maxRows: 12 }),
  authoring: {
    useWhen: [
      'Comparing exactly two things across attributes',
      'Replacing a two-column Markdown table',
    ],
    avoidWhen: ['Comparing more than two things', 'Only one row of comparison'],
    example:
      ':::comparison{left="Option A" right="Option B"}\n- Speed | Fast | Slow\n- Setup | Simple | Advanced\n:::',
  },
})

export const comparisonMarkdown: MarkdownBlockRenderer = (node) => {
  const data = node.data as ComparisonData
  const esc = (s: string) => s.replace(/\|/g, '\\|')
  const left = esc(String(node.props.left))
  const right = esc(String(node.props.right))
  const lines = [`| | ${left} | ${right} |`, '|---|---|---|']
  for (const row of data.rows)
    lines.push(`| ${esc(row.label)} | ${esc(row.left)} | ${esc(row.right)} |`)
  return lines.join('\n')
}
