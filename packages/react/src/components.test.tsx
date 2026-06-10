import { genericBlocks } from '@content-blocks/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@content-blocks/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { ContentBlocks } from './content-blocks.js'

const registry = createBlockRegistry().use(genericBlocks())
const doc = (src: string) => validateDocument(parseDocument(src), registry).document

test('tabs are interactive: clicking a tab switches the visible panel', () => {
  render(
    <ContentBlocks
      document={doc(
        ':::tabs\n::tab{title="One"}\nfirst panel\n::tab{title="Two"}\nsecond panel\n:::\n',
      )}
    />,
  )
  expect(screen.getByText('first panel')).toBeDefined()
  expect(screen.queryByText('second panel')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: 'Two' }))
  expect(screen.getByText('second panel')).toBeDefined()
  expect(screen.queryByText('first panel')).toBeNull()
})

test('tabs use tablist/tab/tabpanel semantics with aria-selected', () => {
  render(
    <ContentBlocks document={doc(':::tabs\n::tab{title="A"}\nx\n::tab{title="B"}\ny\n:::\n')} />,
  )
  expect(screen.getByRole('tablist')).toBeDefined()
  expect(screen.getByRole('tab', { name: 'A' }).getAttribute('aria-selected')).toBe('true')
  expect(screen.getByRole('tabpanel')).toBeDefined()
})

test('tabs clamp the active index when the document shrinks', () => {
  const three = doc(':::tabs\n::tab{title="A"}\na\n::tab{title="B"}\nb\n::tab{title="C"}\nc\n:::\n')
  const two = doc(':::tabs\n::tab{title="A"}\na\n::tab{title="B"}\nb\n:::\n')
  const { rerender } = render(<ContentBlocks document={three} />)
  fireEvent.click(screen.getByRole('tab', { name: 'C' }))
  expect(screen.getByText('c')).toBeDefined()
  rerender(<ContentBlocks document={two} />)
  expect(screen.getByText('a')).toBeDefined() // clamped back to first tab, no crash
})

test('comparison renders a table, steps an ordered list, faq native details', () => {
  render(
    <ContentBlocks
      document={doc(
        ':::comparison{left="A" right="B"}\n- Speed | Fast | Slow\n- Cost | $ | $$\n:::\n\n:::steps\n1. Mix\n2. Rest\n:::\n\n:::faq\n::faq-item{question="Freeze?"}\nYes.\n:::\n',
      )}
    />,
  )
  expect(screen.getByRole('table')).toBeDefined()
  expect(screen.getByText('Mix')).toBeDefined()
  expect(screen.getByText('Freeze?')).toBeDefined()
})
