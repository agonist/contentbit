import { tabsBlock, type TabData } from '@contentbit/blocks'
import { defineBlockComponent } from '@contentbit/react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isValidatedBlock } from '@contentbit/core'

export const TabsBlock = defineBlockComponent(tabsBlock, ({ node, ctx }) => {
  const data = node.data
  return (
    <Tabs data-cb-styled defaultValue="tab-0" className="my-6">
      <TabsList>
        {data.blocks.map((tab, i) => (
          <TabsTrigger key={i} value={`tab-${i}`}>
            {String(tab.props.title)}
          </TabsTrigger>
        ))}
      </TabsList>
      {data.blocks.map((tab, i) => (
        <TabsContent key={i} value={`tab-${i}`} className="text-sm leading-relaxed">
          {ctx.renderMarkdown(isValidatedBlock(tab) ? (tab.data as TabData).markdown : tab.body)}
        </TabsContent>
      ))}
    </Tabs>
  )
})
