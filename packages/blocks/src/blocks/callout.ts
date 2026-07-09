import {
  defineBlock,
  defineMarkdownBlockRenderer,
  markdownBody,
  type MarkdownBodyData,
} from '@contentbit/core'
import { z } from 'zod'

export type CalloutData = MarkdownBodyData

export const calloutBlock = defineBlock({
  name: 'callout',
  description: 'Highlighted note, tip, warning, important, or TLDR box.',
  props: z.object({
    type: z.enum(['note', 'tip', 'warning', 'important', 'tldr']).default('note'),
    title: z.string().min(1).optional(),
  }),
  content: markdownBody({ minLength: 10 }),
  authoring: {
    useWhen: [
      'Practical advice that prevents a common mistake (tip)',
      'Context the reader must not miss (note/important)',
      'Something that ruins the result if ignored (warning)',
      'A 1-3 sentence summary at the top of a section (tldr)',
    ],
    avoidWhen: [
      'Regular prose that is not a standout remark',
      'More than one callout in the same section',
      'Content longer than ~3 sentences',
    ],
    example:
      ':::callout{type="tip" title="Worth knowing"}\nAlways weigh flour — volume measures drift by 20%.\n:::',
  },
})

export const calloutMarkdown = defineMarkdownBlockRenderer(calloutBlock, (node) => {
  const data = node.data
  const title = node.props.title ?? node.props.type
  return `> **${title}:** ${data.markdown}`
})
