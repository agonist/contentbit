import {
  assertValidDocument,
  createBlockRegistry,
  defineMarkdownRenderers,
  parseDocument,
  renderToMarkdown,
  validateDocument,
} from '@contentbit/core'
import { expect, test } from 'vitest'

import { faqBlock, faqItemBlock, faqMarkdown } from './faq.js'
import { tabBlock, tabsBlock, tabsMarkdown } from './tabs.js'

const registry = createBlockRegistry().use([tabsBlock, tabBlock, faqBlock, faqItemBlock])
const renderers = defineMarkdownRenderers([tabsBlock, tabBlock, faqBlock, faqItemBlock], {
  tabs: tabsMarkdown,
  faq: faqMarkdown,
})

test('tabs requires 2-6 titled tab children; renders headed sections', () => {
  const src =
    ':::tabs\n::tab{title="Stand Mixer"}\nHook, speed 2, 8 min.\n::tab{title="By Hand"}\nFold 15 min.\n:::\n'
  const result = validateDocument(parseDocument(src), registry)
  expect(result.ok).toBe(true)
  expect(renderToMarkdown(assertValidDocument(result), { renderers })).toBe(
    '### Stand Mixer\n\nHook, speed 2, 8 min.\n\n### By Hand\n\nFold 15 min.\n',
  )
  expect(tabsBlock.interactive).toBe(true)

  const single = ':::tabs\n::tab{title="Only"}\nx\n:::\n'
  expect(validateDocument(parseDocument(single), registry).ok).toBe(false)
})

test('faq requires faq-item children with question prop; renders Q/A pairs', () => {
  const src =
    ':::faq\n::faq-item{question="Can I freeze it?"}\nYes, up to 3 months.\n::faq-item{question="How long does it keep?"}\nThree days refrigerated.\n:::\n'
  const result = validateDocument(parseDocument(src), registry)
  expect(result.ok).toBe(true)
  expect(renderToMarkdown(assertValidDocument(result), { renderers })).toBe(
    '**Q: Can I freeze it?**\n\nYes, up to 3 months.\n\n**Q: How long does it keep?**\n\nThree days refrigerated.\n',
  )
})
