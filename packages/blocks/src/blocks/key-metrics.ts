import {
  defineBlock,
  pipeRows,
  type MarkdownBlockRenderer,
  type PipeRowsData,
} from '@contentbit/core'

export type KeyMetricsData = PipeRowsData

export const keyMetricsBlock = defineBlock<KeyMetricsData>({
  name: 'key-metrics',
  description: 'Scannable stat cards: a large value with a short label.',
  content: pipeRows({ columns: ['value', 'label'], minRows: 2, maxRows: 8 }),
  authoring: {
    useWhen: ['Surfacing 2-8 numbers the reader should remember', 'Replacing a stats paragraph'],
    avoidWhen: ['Values without a clear unit or context', 'Long textual descriptions'],
    example: ':::key-metrics\n- 42% | Conversion lift\n- 18ms | Median parse time\n:::',
  },
})

export const keyMetricsMarkdown: MarkdownBlockRenderer = (node) => {
  const data = node.data as KeyMetricsData
  return data.rows.map((row) => `- **${row.value}** — ${row.label}`).join('\n')
}
