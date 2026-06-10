import {
  defineBlock,
  listItems,
  type ListItemsData,
  type MarkdownBlockRenderer,
} from '@content-blocks/core'

export type StepsData = ListItemsData

export const stepsBlock = defineBlock<StepsData>({
  name: 'steps',
  description: 'Ordered process steps with visual numbering.',
  content: listItems({ marker: 'ordered', minItems: 2, maxItems: 15 }),
  authoring: {
    useWhen: ['Sequential processes where order matters', '3+ steps that benefit from numbering'],
    avoidWhen: ['Unordered tips — use a bullet list', 'A single step — write it in prose'],
    example: ':::steps\n1. Combine flour and water\n2. Rest 20 minutes\n3. Add salt and mix\n:::',
  },
})

export const stepsMarkdown: MarkdownBlockRenderer = (node) => {
  const data = node.data as StepsData
  return data.items.map((item, i) => `${i + 1}. ${item.text}`).join('\n')
}
