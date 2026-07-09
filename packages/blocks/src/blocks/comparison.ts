import {
  defineBlock,
  defineMarkdownBlockRenderer,
  pipeRows,
  type PipeRowsData,
} from '@contentbit/core'
import { z } from 'zod'

export type ComparisonData = PipeRowsData

export const comparisonBlock = defineBlock({
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

export const comparisonMarkdown = defineMarkdownBlockRenderer(comparisonBlock, (node) => {
  const data = node.data
  const esc = (s: string) => s.replace(/\|/g, '\\|')
  const left = esc(node.props.left)
  const right = esc(node.props.right)
  const lines = [`| | ${left} | ${right} |`, '|---|---|---|']
  for (const row of data.rows)
    lines.push(`| ${esc(row.label)} | ${esc(row.left)} | ${esc(row.right)} |`)
  return lines.join('\n')
})
