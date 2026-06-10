import type { BlockNode, ContentNode, DocumentNode, MarkdownNode } from './ast.js'
import type { Diagnostic, SourcePoint, SourceRange } from './diagnostics.js'

import { parseProps } from './props.js'

export interface ParseResult {
  document: DocumentNode
  diagnostics: Diagnostic[]
}

const NAME = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*'
const OPEN_RE = new RegExp(`^(:{3,})(${NAME})(\\{.*)?\\s*$`)
const CHILD_RE = new RegExp(`^::(${NAME})(\\{.*)?\\s*$`)
const CLOSE_RE = /^(:{3,})\s*$/
const CODE_FENCE_RE = /^(`{3,}|~{3,})/

interface Frame {
  node: BlockNode
  /** Offset of the first body character (start of the line after the open line). */
  bodyStart: number
}

export function parseDocument(source: string): ParseResult {
  const diagnostics: Diagnostic[] = []
  const lines = source.split('\n')
  const lineStart: number[] = Array.from({ length: lines.length })
  let off = 0
  for (let i = 0; i < lines.length; i++) {
    lineStart[i] = off
    off += lines[i].length + 1
  }
  const sourceEnd = source.length

  const point = (line: number, column: number, offset: number): SourcePoint => ({
    line,
    column,
    offset,
  })
  const lineRange = (i: number): SourceRange => ({
    start: point(i + 1, 1, lineStart[i]),
    end: point(i + 1, lines[i].length + 1, lineStart[i] + lines[i].length),
  })
  const eofPoint = (): SourcePoint =>
    point(lines.length, (lines[lines.length - 1] ?? '').length + 1, sourceEnd)

  const document: DocumentNode = {
    type: 'document',
    children: [],
    position: { start: point(1, 1, 0), end: eofPoint() },
  }

  const stack: Frame[] = []
  let mdStartLine: number | null = null
  let codeFence: string | null = null

  const top = (): Frame | undefined => stack[stack.length - 1]
  const sink = (): ContentNode[] => top()?.node.children ?? document.children

  function flushMarkdown(endLineExclusive: number): void {
    if (mdStartLine === null) return
    const startOff = lineStart[mdStartLine]
    const endOff =
      endLineExclusive >= lines.length
        ? sourceEnd
        : Math.max(startOff, lineStart[endLineExclusive] - 1)
    const value = source.slice(startOff, endOff)
    if (value.trim() !== '') {
      const node: MarkdownNode = {
        type: 'markdown',
        value,
        position: {
          start: point(mdStartLine + 1, 1, startOff),
          end: point(endLineExclusive, (lines[endLineExclusive - 1] ?? '').length + 1, endOff),
        },
      }
      sink().push(node)
    }
    mdStartLine = null
  }

  function openBlock(i: number, fence: number, name: string, rawProps: string | null): void {
    const openPosition = lineRange(i)
    const parsed = parseProps(rawProps, openPosition)
    for (const d of parsed.diagnostics) diagnostics.push({ ...d, blockName: name })
    const node: BlockNode = {
      type: 'block',
      name,
      fence,
      props: parsed.props,
      rawProps,
      children: [],
      body: '',
      position: { start: openPosition.start, end: openPosition.end },
      openPosition,
      closePosition: null,
    }
    sink().push(node)
    stack.push({ node, bodyStart: i + 1 < lines.length ? lineStart[i + 1] : sourceEnd })
  }

  /** bodyEndLine = index of the line that terminates the body (close line, sibling open, or lines.length at EOF). */
  function finalize(frame: Frame, bodyEndLine: number, closeLine: number | null): void {
    const endOff =
      bodyEndLine >= lines.length
        ? sourceEnd
        : Math.max(frame.bodyStart, lineStart[bodyEndLine] - 1)
    frame.node.body = source.slice(frame.bodyStart, endOff)
    if (closeLine !== null) {
      frame.node.closePosition = lineRange(closeLine)
      frame.node.position = {
        start: frame.node.openPosition.start,
        end: frame.node.closePosition.end,
      }
    } else {
      frame.node.position = {
        start: frame.node.openPosition.start,
        end:
          bodyEndLine >= lines.length
            ? eofPoint()
            : point(bodyEndLine, (lines[bodyEndLine - 1] ?? '').length + 1, endOff),
      }
    }
  }

  function popChildIfOpen(i: number): void {
    if (top()?.node.fence === 2) {
      flushMarkdown(i)
      finalize(stack.pop() as (typeof stack)[number], i, null)
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Code fences are opaque: nothing inside them opens or closes blocks.
    const fenceMatch = trimmed.match(CODE_FENCE_RE)
    if (codeFence !== null) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === codeFence[0] &&
        fenceMatch[1].length >= codeFence.length
      ) {
        codeFence = null
      }
      if (mdStartLine === null) mdStartLine = i
      continue
    }
    if (fenceMatch) {
      codeFence = fenceMatch[1]
      if (mdStartLine === null) mdStartLine = i
      continue
    }

    const close = trimmed.match(CLOSE_RE)
    if (close) {
      popChildIfOpen(i)
      flushMarkdown(i)
      const frame = top()
      if (!frame) {
        diagnostics.push({
          code: 'CB_UNMATCHED_CLOSE',
          severity: 'warning',
          message: `Closing fence "${close[1]}" has no open block.`,
          position: lineRange(i),
        })
        mdStartLine = i // keep it as literal markdown
        continue
      }
      if (close[1].length !== frame.node.fence) {
        diagnostics.push({
          code: 'CB_FENCE_MISMATCH',
          severity: 'warning',
          message: `Closing fence has ${close[1].length} colons but ":::${frame.node.name}" opened with ${frame.node.fence}.`,
          hint: 'Match the opening fence length, or use a longer fence on the outer block to disambiguate nesting.',
          blockName: frame.node.name,
          position: lineRange(i),
        })
      }
      stack.pop()
      finalize(frame, i, i)
      continue
    }

    const open = trimmed.match(OPEN_RE)
    if (open) {
      flushMarkdown(i)
      openBlock(i, open[1].length, open[2], open[3] ?? null)
      continue
    }

    const child = trimmed.match(CHILD_RE)
    if (child) {
      if (stack.length === 0) {
        diagnostics.push({
          code: 'CB_CHILD_OUTSIDE_BLOCK',
          severity: 'warning',
          message: `Child block "::${child[1]}" used outside of a container block; treated as plain text.`,
          blockName: child[1],
          position: lineRange(i),
        })
        if (mdStartLine === null) mdStartLine = i
        continue
      }
      popChildIfOpen(i)
      flushMarkdown(i)
      openBlock(i, 2, child[1], child[2] ?? null)
      continue
    }

    if (mdStartLine === null) mdStartLine = i
  }

  // EOF: close children implicitly, report unclosed containers.
  flushMarkdown(lines.length)
  while (stack.length > 0) {
    const frame = stack.pop() as Frame
    finalize(frame, lines.length, null)
    if (frame.node.fence >= 3) {
      diagnostics.push({
        code: 'CB_UNCLOSED_BLOCK',
        severity: 'error',
        message: `Block ":::${frame.node.name}" is never closed.`,
        hint: `Add a line containing only "${':'.repeat(frame.node.fence)}" after the block body.`,
        blockName: frame.node.name,
        position: frame.node.openPosition,
      })
    }
  }

  return { document, diagnostics }
}
