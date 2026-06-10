import type { SourceRange } from './diagnostics.js'

export interface DocumentNode {
  type: 'document'
  children: ContentNode[]
  position: SourceRange
}

export type ContentNode = MarkdownNode | BlockNode

/** A verbatim run of plain Markdown between blocks. Core never parses inside it. */
export interface MarkdownNode {
  type: 'markdown'
  value: string
  position: SourceRange
}

export interface BlockNode {
  type: 'block'
  name: string
  /** Number of colons in the opening fence: >=3 container, 2 child. */
  fence: number
  props: Record<string, unknown>
  rawProps: string | null
  children: ContentNode[]
  /** Raw inner source between open and close lines (includes nested block text). */
  body: string
  position: SourceRange
  openPosition: SourceRange
  /** null for implicitly closed child blocks and unclosed blocks. */
  closePosition: SourceRange | null
}
