import { defineMarkdownRenderers, type BlockDefinition } from '@contentbit/core'

import { calloutBlock, calloutMarkdown } from './blocks/callout.js'
import { comparisonBlock, comparisonMarkdown } from './blocks/comparison.js'
import { faqBlock, faqItemBlock, faqMarkdown } from './blocks/faq.js'
import { keyMetricsBlock, keyMetricsMarkdown } from './blocks/key-metrics.js'
import { prosConsBlock, prosConsMarkdown } from './blocks/pros-cons.js'
import { quickRefBlock, quickRefMarkdown } from './blocks/quick-ref.js'
import { stepsBlock, stepsMarkdown } from './blocks/steps.js'
import { tabBlock, tabsBlock, tabsMarkdown } from './blocks/tabs.js'

export * from './blocks/callout.js'
export * from './blocks/comparison.js'
export * from './blocks/faq.js'
export * from './blocks/key-metrics.js'
export * from './blocks/pros-cons.js'
export * from './blocks/quick-ref.js'
export * from './blocks/steps.js'
export * from './blocks/tabs.js'

/** The default generic block pack: 8 blocks + 2 child blocks. */
export const genericBlockDefinitions = [
  calloutBlock,
  stepsBlock,
  keyMetricsBlock,
  quickRefBlock,
  comparisonBlock,
  prosConsBlock,
  tabsBlock,
  tabBlock,
  faqBlock,
  faqItemBlock,
] as const

export function genericBlocks(): BlockDefinition<unknown>[] {
  return [...genericBlockDefinitions] as BlockDefinition<unknown>[]
}

/** Markdown fallback renderers for the generic pack. */
export const genericMarkdownRenderers = defineMarkdownRenderers(genericBlockDefinitions, {
  callout: calloutMarkdown,
  steps: stepsMarkdown,
  'key-metrics': keyMetricsMarkdown,
  'quick-ref': quickRefMarkdown,
  comparison: comparisonMarkdown,
  'pros-cons': prosConsMarkdown,
  tabs: tabsMarkdown,
  faq: faqMarkdown,
})
