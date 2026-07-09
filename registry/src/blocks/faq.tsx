import { faqBlock, type FaqItemData } from '@contentbit/blocks'
import { defineBlockComponent } from '@contentbit/react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { isValidatedBlock } from '@contentbit/core'

export const FaqBlock = defineBlockComponent(faqBlock, ({ node, ctx }) => {
  const data = node.data
  return (
    <div data-cb-styled className="bg-card my-6 rounded-lg border px-4">
      <Accordion type="single" collapsible>
        {data.blocks.map((item, i) => (
          <AccordionItem
            key={i}
            value={`item-${i}`}
            className={i === data.blocks.length - 1 ? 'border-b-0' : undefined}
          >
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
              {String(item.props.question)}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
              {ctx.renderMarkdown(
                isValidatedBlock(item) ? (item.data as FaqItemData).markdown : item.body,
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
})
