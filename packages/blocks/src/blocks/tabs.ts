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

export type TabsData = ChildBlocksData
export type TabData = MarkdownBodyData

export const tabBlock = defineBlock({
  name: 'tab',
  description: 'One tab panel with a title.',
  props: z.object({ title: z.string().min(1) }),
  content: markdownBody(),
  childOnly: true,
  authoring: {
    useWhen: ['Only inside :::tabs'],
    avoidWhen: ['Anywhere outside :::tabs'],
    example: '::tab{title="Stand Mixer"}\nUse the dough hook on speed 2.',
  },
})

export const tabsBlock = defineBlock({
  name: 'tabs',
  description: 'Tabbed switcher for alternative methods or variants — the reader picks one.',
  content: childBlocks({ allowed: ['tab'], minChildren: 2, maxChildren: 6 }),
  interactive: true,
  authoring: {
    useWhen: [
      'Two or more alternative methods for the same task',
      'Variants by equipment, audience, or budget',
    ],
    avoidWhen: ['Side-by-side comparison — use comparison', 'Sequential content — use steps'],
    example:
      ':::tabs\n::tab{title="Fast"}\nUse this when time matters.\n::tab{title="Cheap"}\nUse this when budget matters.\n:::',
  },
})

export const tabsMarkdown = defineMarkdownBlockRenderer(tabsBlock, (node) => {
  const data = node.data
  return data.blocks
    .map((tab) => {
      const body = isValidatedBlock(tab) ? (tab.data as TabData).markdown : tab.body.trim()
      return `### ${String(tab.props.title)}\n\n${body}`
    })
    .join('\n\n')
})
