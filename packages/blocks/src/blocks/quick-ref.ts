import {
  defineBlock,
  pipeRows,
  type MarkdownBlockRenderer,
  type PipeRowsData,
} from '@contentbit/core'

export type QuickRefData = PipeRowsData

export const quickRefBlock = defineBlock<QuickRefData>({
  name: 'quick-ref',
  description: 'Compact key/value reference card.',
  content: pipeRows({ columns: ['key', 'value'], minRows: 2, maxRows: 12 }),
  authoring: {
    useWhen: [
      'Facts a reader will return to (temperatures, ratios, durations)',
      'At-a-glance summaries near the top of a guide',
    ],
    avoidWhen: ['Narrative content', 'Comparing options — use comparison instead'],
    example: ':::quick-ref\n- Hydration | 65%\n- Proof time | 2h at 24°C\n:::',
  },
})

export const quickRefMarkdown: MarkdownBlockRenderer = (node) => {
  const data = node.data as QuickRefData
  return data.rows.map((row) => `- **${row.key}:** ${row.value}`).join('\n')
}
