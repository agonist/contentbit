import {
  defineBlock,
  listItems,
  type ListItemsData,
  type MarkdownBlockRenderer,
} from '@contentbit/core'

export type ProsConsData = ListItemsData

export function splitProsCons(data: ProsConsData): { pros: string[]; cons: string[] } {
  return {
    pros: data.items.filter((i) => i.sign === '+').map((i) => i.text),
    cons: data.items.filter((i) => i.sign === '-').map((i) => i.text),
  }
}

export const prosConsBlock = defineBlock<ProsConsData>({
  name: 'pros-cons',
  description: 'Paired advantages (+) and disadvantages (-) of one option.',
  content: listItems({ marker: 'signed', minItems: 2, maxItems: 16 }),
  authoring: {
    useWhen: ["Evaluating a single option's trade-offs", 'Summarizing a review'],
    avoidWhen: ['Comparing two options — use comparison', 'Only positives or only negatives'],
    example: ':::pros-cons\n+ Cheap to run\n+ Fast setup\n- No offline mode\n:::',
  },
})

export const prosConsMarkdown: MarkdownBlockRenderer = (node) => {
  const { pros, cons } = splitProsCons(node.data as ProsConsData)
  const parts: string[] = []
  if (pros.length > 0) parts.push('**Pros**', '', ...pros.map((p) => `- ${p}`))
  if (cons.length > 0) {
    if (parts.length > 0) parts.push('')
    parts.push('**Cons**', '', ...cons.map((c) => `- ${c}`))
  }
  return parts.join('\n')
}
