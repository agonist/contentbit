import type { BlockNode } from './ast.js'
import type { SourceRange } from './diagnostics.js'

/**
 * Document-level range of the Nth line (0-based) of a block's body.
 * Content models use this so row/item diagnostics point at the exact line.
 */
export function bodyLineRange(node: BlockNode, bodyLineIndex: number): SourceRange {
  const bodyLines = node.body.split('\n')
  const text = bodyLines[bodyLineIndex] ?? ''
  let offset = node.openPosition.end.offset + 1 // skip the newline after the open line
  for (let i = 0; i < bodyLineIndex; i++) offset += bodyLines[i].length + 1
  const line = node.openPosition.start.line + 1 + bodyLineIndex
  return {
    start: { line, column: 1, offset },
    end: { line, column: text.length + 1, offset: offset + text.length },
  }
}
