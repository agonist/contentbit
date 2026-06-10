import type { FaqData, FaqItemData } from '@content-blocks/blocks'
import type { BlockComponentProps } from '@content-blocks/react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { isValidatedBlock } from '@content-blocks/core'

export function FaqBlock({ node, ctx }: BlockComponentProps) {
  const data = node.data as FaqData
  return (
    <div data-cb-styled className="my-6">
      <Accordion type="single" collapsible>
        {data.blocks.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger>{String(item.props.question)}</AccordionTrigger>
            <AccordionContent>
              {ctx.renderMarkdown(
                isValidatedBlock(item) ? (item.data as FaqItemData).markdown : item.body,
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
