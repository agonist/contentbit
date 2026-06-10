import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { ContentBlocks } from './content-blocks.js'

const registry = createBlockRegistry().use(genericBlocks())
const doc = (src: string) => validateDocument(parseDocument(src), registry).document

test('renders markdown segments through renderMarkdown and blocks through components', () => {
  render(
    <ContentBlocks
      document={doc('intro\n\n:::callout{type="tip" title="Scale"}\nWeigh it.\n:::\n')}
      renderMarkdown={(md) => <p>{md.trim()}</p>}
    />,
  )
  expect(screen.getByText('intro')).toBeDefined()
  expect(screen.getByText('Scale')).toBeDefined()
  expect(screen.getByText('Weigh it.')).toBeDefined()
})

test('component overrides win over defaults', () => {
  render(
    <ContentBlocks
      document={doc(':::steps\n1. a\n2. b\n:::\n')}
      components={{ steps: ({ node }) => <div data-testid="custom">{node.name}</div> }}
    />,
  )
  expect(screen.getByTestId('custom').textContent).toBe('steps')
})

test('invalid blocks render the fallback (escaped body)', () => {
  render(<ContentBlocks document={doc(':::mystery\nraw text\n:::\n')} />)
  expect(screen.getByText('raw text')).toBeDefined()
})
