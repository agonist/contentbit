import type { BlockComponent } from '@contentbit/react'
import type { DocumentNode } from '@contentbit/core'
import type { ComponentType } from 'react'

import { ContentBlocks } from '@contentbit/react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface FallbackProps {
  name: string
  body: string
}

export function renderStudioPreview(
  document: DocumentNode,
  components: Record<string, BlockComponent> = {},
): string {
  return renderToStaticMarkup(
    createElement(ContentBlocks, {
      document,
      components,
      renderMarkdown,
      fallback: CustomBlockFallback,
    }),
  )
}

function renderMarkdown(markdown: string) {
  return createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, markdown)
}

const CustomBlockFallback: ComponentType<FallbackProps> = ({ name, body }) =>
  createElement(
    'section',
    { className: 'cb-custom-block', 'data-cb-custom': name },
    createElement('div', { className: 'cb-custom-block-label' }, name),
    createElement(
      'div',
      { className: 'cb-custom-block-body' },
      body.trim().length > 0
        ? renderMarkdown(body)
        : createElement('p', null, 'No preview component for this custom block yet.'),
    ),
  )
