import { defineBlock, markdownBody } from '@contentbit/core'
import { test } from 'vitest'
import { z } from 'zod'

import { defineBlockComponent, defineBlockComponents } from './content-blocks.js'

const quote = defineBlock({
  name: 'quote',
  description: 'A quote.',
  props: z.object({ author: z.string() }),
  content: markdownBody(),
  authoring: { useWhen: ['testing'], avoidWhen: [], example: '' },
})

const Quote = defineBlockComponent(quote, ({ node }) => {
  const author: string = node.props.author
  const markdown: string = node.data.markdown
  return <blockquote>{author + markdown}</blockquote>
})

defineBlockComponents([quote] as const, { quote: Quote })
defineBlockComponents([quote] as const, {
  // @ts-expect-error component keys must match registered block names
  typo: Quote,
})

test('definition-aware component types compile', () => {})
