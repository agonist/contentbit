import { expect, test } from 'vitest'

import {
  assertValidDocument,
  compileDocument,
  createBlockRegistry,
  defineBlock,
  isValidatedDocument,
  markdownBody,
} from './index.js'

const callout = defineBlock({
  name: 'callout',
  description: 'A callout.',
  content: markdownBody(),
  authoring: { useWhen: ['testing'], avoidWhen: [], example: ':::callout\nBody.\n:::' },
})
const registry = createBlockRegistry().add(callout)

test('invalid compiled content is processed but not branded as validated', () => {
  const result = compileDocument(':::unknown\nBody.\n:::\n', registry)

  expect(result.ok).toBe(false)
  expect(isValidatedDocument(result.document)).toBe(false)
  expect(() => assertValidDocument(result, 'article.md')).toThrow(
    /article\.md:1:1 error CB_UNKNOWN_BLOCK/,
  )
})

test('valid compiled content strips frontmatter and returns a validated document', () => {
  const result = compileDocument('---\ntitle: Hello\n---\n\n:::callout\nBody.\n:::\n', registry)
  const document = assertValidDocument(result, 'article.md')

  expect(result.ok).toBe(true)
  expect(isValidatedDocument(document)).toBe(true)
  expect(document.children).toHaveLength(1)
  expect(document.children[0]).toMatchObject({ type: 'block', name: 'callout' })
})
