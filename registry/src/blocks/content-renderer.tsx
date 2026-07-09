import type { ProcessedDocumentNode } from '@contentbit/core'
import type { ReactNode } from 'react'

import { genericBlockDefinitions } from '@contentbit/blocks'
import { ContentBlocks, defineBlockComponents, type BlockComponent } from '@contentbit/react'

import { CalloutBlock } from './callout'
import { ComparisonBlock } from './comparison'
import { FaqBlock } from './faq'
import { KeyMetricsBlock } from './key-metrics'
import { ProsConsBlock } from './pros-cons'
import { QuickRefBlock } from './quick-ref'
import { StepsBlock } from './steps'
import { TabsBlock } from './tabs-block'

export const styledComponents = defineBlockComponents(genericBlockDefinitions, {
  callout: CalloutBlock,
  steps: StepsBlock,
  'key-metrics': KeyMetricsBlock,
  'quick-ref': QuickRefBlock,
  comparison: ComparisonBlock,
  'pros-cons': ProsConsBlock,
  tabs: TabsBlock,
  faq: FaqBlock,
})

export interface ContentRendererProps {
  document: ProcessedDocumentNode
  /** Plug your app's Markdown pipeline here. Defaults to plain paragraphs. */
  renderMarkdown?: (md: string) => ReactNode
  components?: Record<string, BlockComponent>
}

export function ContentRenderer({ document, renderMarkdown, components }: ContentRendererProps) {
  return (
    <ContentBlocks
      document={document}
      components={{ ...styledComponents, ...components }}
      renderMarkdown={renderMarkdown}
    />
  )
}
