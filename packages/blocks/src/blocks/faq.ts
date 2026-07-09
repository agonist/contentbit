import {
  childBlocks,
  defineBlock,
  defineMarkdownBlockRenderer,
  isValidatedBlock,
  markdownBody,
  type ChildBlocksData,
  type MarkdownBodyData,
} from '@contentbit/core'
import { z } from 'zod'

export type FaqData = ChildBlocksData
export type FaqItemData = MarkdownBodyData

export const faqItemBlock = defineBlock({
  name: 'faq-item',
  description: 'One question/answer pair.',
  props: z.object({ question: z.string().min(1) }),
  content: markdownBody(),
  childOnly: true,
  authoring: {
    useWhen: ['Only inside :::faq'],
    avoidWhen: ['Anywhere outside :::faq'],
    example: '::faq-item{question="Can I freeze it?"}\nYes, up to 3 months.',
  },
})

export const faqBlock = defineBlock({
  name: 'faq',
  description: 'Frequently asked questions with expandable answers.',
  content: childBlocks({ allowed: ['faq-item'], minChildren: 1, maxChildren: 20 }),
  interactive: true,
  authoring: {
    useWhen: ['Real questions readers ask about the topic', 'End-of-article FAQ sections'],
    avoidWhen: ['Content that is not literally question/answer', 'A single trivial question'],
    example: ':::faq\n::faq-item{question="Can I freeze it?"}\nYes, up to 3 months.\n:::',
  },
})

export const faqMarkdown = defineMarkdownBlockRenderer(faqBlock, (node) => {
  const data = node.data
  return data.blocks
    .map((item) => {
      const body = isValidatedBlock(item) ? (item.data as FaqItemData).markdown : item.body.trim()
      return `**Q: ${String(item.props.question)}**\n\n${body}`
    })
    .join('\n\n')
})
