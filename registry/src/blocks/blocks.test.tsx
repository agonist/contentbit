import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { ContentRenderer } from './content-renderer'

const registry = createBlockRegistry().use(genericBlocks())
const doc = (src: string) => validateDocument(parseDocument(src), registry).document

test('renders the styled callout with its type label and title', () => {
  const { container } = render(
    <ContentRenderer
      document={doc(':::callout{type="warning" title="Hot oven"}\nMind your hands.\n:::\n')}
    />,
  )
  const aside = container.querySelector('aside')
  expect(aside?.className).toContain('border-amber-500/30')
  expect(screen.getByText('Warning')).toBeDefined()
  expect(screen.getByText('Hot oven')).toBeDefined()
})

test('styled tabs switch panels via shadcn Tabs', () => {
  render(
    <ContentRenderer
      document={doc(':::tabs\n::tab{title="One"}\nfirst\n::tab{title="Two"}\nsecond\n:::\n')}
    />,
  )
  expect(screen.getByText('first')).toBeDefined()
  // Radix TabsTrigger activates on mousedown, not click
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Two' }), { button: 0 })
  expect(screen.getByText('second')).toBeDefined()
})

test('styled faq renders an accordion with all questions', () => {
  render(
    <ContentRenderer
      document={doc(
        ':::faq\n::faq-item{question="Q1?"}\nA1.\n::faq-item{question="Q2?"}\nA2.\n:::\n',
      )}
    />,
  )
  expect(screen.getByText('Q1?')).toBeDefined()
  expect(screen.getByText('Q2?')).toBeDefined()
})

test('every generic block name has a styled component', () => {
  const src = [
    ':::callout{type="tip"}\nTip body here.\n:::',
    ':::steps\n1. a\n2. b\n:::',
    ':::key-metrics\n- 1 | one\n- 2 | two\n:::',
    ':::quick-ref\n- k | v\n- k2 | v2\n:::',
    ':::comparison{left="L" right="R"}\n- x | 1 | 2\n- y | 3 | 4\n:::',
    ':::pros-cons\n+ good\n- bad\n:::',
    ':::tabs\n::tab{title="T1"}\nt1\n::tab{title="T2"}\nt2\n:::',
    ':::faq\n::faq-item{question="Q?"}\nA.\n:::',
  ].join('\n\n')
  const { container } = render(<ContentRenderer document={doc(src + '\n')} />)
  expect(container.querySelectorAll('[data-cb-styled]').length).toBe(8)
})
