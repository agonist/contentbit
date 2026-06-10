import { expect, test } from 'vitest'

import { formatDiagnostic, type Diagnostic } from './diagnostics.js'

const diag: Diagnostic = {
  code: 'CB_ROW_COLUMNS',
  severity: 'error',
  message: 'comparison rows require 3 columns. Found 2.',
  hint: 'Format: Label | Left value | Right value',
  blockName: 'comparison',
  position: {
    start: { line: 12, column: 3, offset: 240 },
    end: { line: 12, column: 30, offset: 267 },
  },
}

test('formatDiagnostic prints file:line:col severity code, message, hint', () => {
  expect(formatDiagnostic(diag, 'content.md')).toBe(
    'content.md:12:3 error CB_ROW_COLUMNS\ncomparison rows require 3 columns. Found 2.\nhint: Format: Label | Left value | Right value',
  )
})

test('formatDiagnostic omits hint line when absent', () => {
  const { hint: _hint, ...rest } = diag
  expect(formatDiagnostic(rest, 'a.md')).toBe(
    'a.md:12:3 error CB_ROW_COLUMNS\ncomparison rows require 3 columns. Found 2.',
  )
})
