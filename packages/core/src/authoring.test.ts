import { expect, test } from 'vitest'
import { z } from 'zod'

import { markdownBody, pipeRows } from './content-models.js'
import { createBlockRegistry, defineBlock } from './registry.js'

const registry = createBlockRegistry().use([
  defineBlock({
    name: 'callout',
    description: 'Highlighted note or tip.',
    props: z.object({
      type: z.enum(['note', 'tip']).default('note'),
      title: z.string().optional(),
    }),
    content: markdownBody(),
    authoring: {
      useWhen: ['Drawing attention to a pitfall'],
      avoidWhen: ['Regular prose'],
      example: ':::callout{type="tip"}\nUse a scale.\n:::',
    },
  }),
  defineBlock({
    name: 'comparison',
    description: 'Exactly two options side by side.',
    props: z.object({ left: z.string(), right: z.string() }),
    content: pipeRows({ columns: ['label', 'left', 'right'], minRows: 2, maxRows: 12 }),
    authoring: {
      useWhen: ['Comparing exactly two things'],
      avoidWhen: ['More than two options'],
      example: ':::comparison{left="A" right="B"}\n- Speed | Fast | Slow\n:::',
    },
  }),
  defineBlock({
    name: 'tab',
    description: 'One tab.',
    props: z.object({ title: z.string() }),
    content: markdownBody(),
    childOnly: true,
    authoring: { useWhen: ['Inside :::tabs'], avoidWhen: [], example: '::tab{title="A"}' },
  }),
])

test('llm guide lists rules, every block, syntax, use/avoid, examples', () => {
  const guide = registry.toAuthoringGuide({ audience: 'llm' })
  expect(guide).toContain('write regular Markdown by default')
  expect(guide).toContain('never invent block names')
  expect(guide).toContain('## callout')
  expect(guide).toContain('Use when:')
  expect(guide).toContain('- Drawing attention to a pitfall')
  expect(guide).toContain('Avoid when:')
  expect(guide).toContain(':::callout{type="tip"}')
  expect(guide).toContain('List rows: `- label | left | right`')
  expect(guide).toContain('(child block — only inside a parent that allows it)')
})

test('examples can be excluded', () => {
  const guide = registry.toAuthoringGuide({ audience: 'llm', includeExamples: false })
  expect(guide).not.toContain(':::callout{type="tip"}')
})
