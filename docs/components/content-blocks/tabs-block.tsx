import type { TabData, TabsData } from '@content-blocks/blocks'
import type { BlockComponentProps } from '@content-blocks/react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isValidatedBlock } from '@content-blocks/core'

export function TabsBlock({ node, ctx }: BlockComponentProps) {
  const data = node.data as TabsData
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
}
