import { expect, test } from 'vitest'
import { z } from 'zod'

import { markdownBody } from './content-models.js'
import { createBlockRegistry, defineBlock } from './registry.js'

const noteBlock = defineBlock({
  name: 'note',
  description: 'A note.',
  props: z.object({ title: z.string().optional() }),
  content: markdownBody(),
  authoring: {
    useWhen: ['Adding context'],
    avoidWhen: ['Long prose'],
    example: ':::note\nhi\n:::',
  },
})

test('registry stores and retrieves definitions', () => {
  const registry = createBlockRegistry().add(noteBlock)
  expect(registry.get('note')?.description).toBe('A note.')
  expect(registry.all().map((d) => d.name)).toEqual(['note'])
})

test('use() adds a pack of definitions', () => {
  const other = defineBlock({ ...noteBlock, name: 'aside' })
  const registry = createBlockRegistry().use([noteBlock, other])
  expect(registry.all()).toHaveLength(2)
})

test('duplicate names throw', () => {
  const registry = createBlockRegistry().add(noteBlock)
  expect(() => registry.add(noteBlock)).toThrow(/Duplicate block "note"/)
})

test('defineBlock rejects non-kebab-case names', () => {
  expect(() => defineBlock({ ...noteBlock, name: 'Bad_Name' })).toThrow(/kebab-case/)
})
