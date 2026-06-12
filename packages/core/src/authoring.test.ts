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
  defineBlock({
    name: 'quote',
    description: 'A pull quote.',
    props: z.object({
      author: z.string(),
      role: z.string().optional().describe('Shown after the author name'),
      year: z.number().optional(),
      featured: z.boolean().default(false),
    }),
    content: markdownBody(),
    authoring: { useWhen: ['Quoting a person'], avoidWhen: [], example: '' },
  }),
  defineBlock({
    name: 'divider',
    description: 'A thematic break.',
    content: markdownBody(),
    authoring: { useWhen: ['Separating sections'], avoidWhen: [], example: '' },
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

test('every prop is documented from the schema: type, required, default, description', () => {
  const guide = registry.toAuthoringGuide({ audience: 'llm' })
  // Optional props exist for authors only if the guide says so.
  expect(guide).toContain('- author: string (required)')
  expect(guide).toContain('- role: string (optional) — Shown after the author name')
  expect(guide).toContain('- year: number (optional)')
  expect(guide).toContain('- featured: boolean (optional, default: false)')
  // Enums enumerate their values; defaults are spelled out.
  expect(guide).toContain('- type: one of note|tip (optional, default: note)')
  expect(guide).toContain('- title: string (optional)')
  expect(guide).toContain('- left: string (required)')
})

test('prop-less blocks have no Props section', () => {
  const guide = registry.toAuthoringGuide({ audience: 'llm' })
  const divider = guide.slice(guide.indexOf('## divider'))
  expect(divider).not.toContain('Props:')
})

test('examples can be excluded', () => {
  const guide = registry.toAuthoringGuide({ audience: 'llm', includeExamples: false })
  expect(guide).not.toContain(':::callout{type="tip"}')
})
