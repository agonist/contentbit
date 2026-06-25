import type { BlockComponent } from '@contentbit/react'
import type { ValidatedDocumentNode } from '@contentbit/core'
import type { ComponentType } from 'react'

import { ContentBlocks, defaultComponents } from '@contentbit/react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface FallbackProps {
  name: string
  body: string
}

export function renderStudioPreview(
  document: ValidatedDocumentNode,
  components: Record<string, BlockComponent> = {},
  options: { includeGenericComponents?: boolean } = {},
): string {
  const previewComponents =
    options.includeGenericComponents === false
      ? { ...genericFallbackComponents, ...components }
      : components

  return renderToStaticMarkup(
    createElement(ContentBlocks, {
      document,
      components: previewComponents,
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

const genericFallbackComponents: Record<string, BlockComponent> = Object.fromEntries(
  Object.keys(defaultComponents).map((name) => [
    name,
    (({ node }) =>
      createElement(CustomBlockFallback, {
        name: node.name,
        body: node.body,
      })) satisfies BlockComponent,
  ]),
)
