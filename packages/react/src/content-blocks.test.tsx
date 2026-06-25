import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { ContentBlocks, type BlockComponent } from './content-blocks.js'

const registry = createBlockRegistry().use(genericBlocks())
const doc = (src: string) => validateDocument(parseDocument(src), registry).document

const Callout: BlockComponent = ({ node, ctx }) => {
  const data = node.data as { markdown: string }
  return (
    <aside data-testid="callout">
      <strong>{String(node.props.title)}</strong>
      {ctx.renderMarkdown(data.markdown)}
    </aside>
  )
}

test('renders markdown segments through renderMarkdown and blocks through supplied components', () => {
  render(
    <ContentBlocks
      document={doc('intro\n\n:::callout{type="tip" title="Scale"}\nWeigh it.\n:::\n')}
      components={{ callout: Callout }}
      renderMarkdown={(md) => <p>{md.trim()}</p>}
    />,
  )
  expect(screen.getByText('intro')).toBeDefined()
  expect(screen.getByText('Scale')).toBeDefined()
  expect(screen.getByText('Weigh it.')).toBeDefined()
})

test('matching supplied components receive the validated block node', () => {
  render(
    <ContentBlocks
      document={doc(':::steps\n1. a\n2. b\n:::\n')}
      components={{ steps: ({ node }) => <div data-testid="custom">{node.name}</div> }}
    />,
  )
  expect(screen.getByTestId('custom').textContent).toBe('steps')
})

test('valid blocks without a component render the fallback', () => {
  render(<ContentBlocks document={doc(':::callout{type="tip"}\nraw text\n:::\n')} />)
  expect(screen.getByText('raw text')).toBeDefined()
})

test('invalid blocks render the fallback (escaped body)', () => {
  render(<ContentBlocks document={doc(':::mystery\nraw text\n:::\n')} />)
  expect(screen.getByText('raw text')).toBeDefined()
})
