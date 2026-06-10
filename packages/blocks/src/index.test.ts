import { createBlockRegistry, parseDocument, validateDocument } from '@content-blocks/core'
import { expect, test } from 'vitest'

import { genericBlocks, genericMarkdownRenderers } from './index.js'

test('genericBlocks registers 10 definitions without collisions', () => {
  const registry = createBlockRegistry().use(genericBlocks())
  expect(
    registry
      .all()
      .map((d) => d.name)
      .sort(),
  ).toEqual([
    'callout',
    'comparison',
    'faq',
    'faq-item',
    'key-metrics',
    'pros-cons',
    'quick-ref',
    'steps',
    'tab',
    'tabs',
  ])
})

test("every block's authoring example validates against its own definition", () => {
  const registry = createBlockRegistry().use(genericBlocks())
  for (const def of registry.all()) {
    if (def.childOnly) continue // examples for child blocks are fragments
    const result = validateDocument(parseDocument(def.authoring.example + '\n'), registry)
    expect(
      result.diagnostics.filter((d) => d.severity === 'error'),
      `example for ${def.name}`,
    ).toEqual([])
  }
})

test('a markdown renderer exists for every non-child block', () => {
  const registry = createBlockRegistry().use(genericBlocks())
  for (const def of registry.all()) {
    if (def.childOnly) continue
    expect(genericMarkdownRenderers[def.name], `renderer for ${def.name}`).toBeTypeOf('function')
  }
})

test('the registry generates a complete authoring guide', () => {
  const guide = createBlockRegistry().use(genericBlocks()).toAuthoringGuide({ audience: 'llm' })
  for (const name of [
    'callout',
    'steps',
    'key-metrics',
    'quick-ref',
    'comparison',
    'pros-cons',
    'tabs',
    'faq',
  ]) {
    expect(guide).toContain(`## ${name}`)
  }
})
