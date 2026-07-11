'use client'

import { genericBlocks } from '@contentbit/blocks'
import { assertValidDocument, compileDocument, createBlockRegistry } from '@contentbit/core'
import ReactMarkdown from 'react-markdown'

// The styled pack installed by shadcn. Yours to edit.
import { ContentRenderer } from '@/components/content-blocks/content-renderer'
// Everything block-related lives in the blocks/ folder: definitions in
// registry.ts (shared with the validate CLI), components in components.tsx.
import customBlocks from '../../blocks/registry'
import { blockComponents } from '../../blocks/components'

const registry = createBlockRegistry().use(genericBlocks()).use(customBlocks)

export function Content({ source }: { source: string }) {
  const document = assertValidDocument(compileDocument(source, registry))
  return (
    <ContentRenderer
      document={document}
      components={blockComponents}
      renderMarkdown={(md) => <ReactMarkdown>{md}</ReactMarkdown>}
    />
  )
}
