import type { BlockNode } from './ast.js'
import type { ContentModel, Report } from './registry.js'

import { bodyLineRange } from './position.js'

function blockDiag(
  node: BlockNode,
  code: string,
  message: string,
  hint?: string,
  severity: 'error' | 'warning' = 'error',
) {
  return { code, severity, message, hint, blockName: node.name, position: node.openPosition }
}

/* ── markdownBody ── */

export interface MarkdownBodyOptions {
  required?: boolean
  minLength?: number
  maxLength?: number
}

export interface MarkdownBodyData {
  markdown: string
}

export function markdownBody(opts: MarkdownBodyOptions = {}): ContentModel<MarkdownBodyData> {
  const required = opts.required ?? true
  return {
    kind: 'markdown',
    describe: () => 'Markdown body',
    parse(node, report) {
      const markdown = node.body.trim()
      if (required && markdown === '') {
        report(blockDiag(node, 'CB_BODY_EMPTY', `:::${node.name} requires a body.`))
      } else if (opts.minLength !== undefined && markdown.length < opts.minLength) {
        report(
          blockDiag(
            node,
            'CB_BODY_LENGTH',
            `:::${node.name} body is shorter than ${opts.minLength} characters.`,
            undefined,
            'warning',
          ),
        )
      }
      if (opts.maxLength !== undefined && markdown.length > opts.maxLength) {
        report(
          blockDiag(
            node,
            'CB_BODY_LENGTH',
            `:::${node.name} body exceeds ${opts.maxLength} characters.`,
            undefined,
            'warning',
          ),
        )
      }
      return { markdown }
    },
  }
}

/* ── pipeRows ── */

export interface PipeRowsOptions {
  columns: string[]
  /** Number of trailing columns that may be omitted (filled with ""). */
  optionalColumns?: number
  minRows?: number
  maxRows?: number
  allowMarkdown?: boolean
}

export interface PipeRowsData {
  rows: Array<Record<string, string>>
}

const ROW_RE = /^\s*-\s+(.*)$/
// Known limitation: a cell value ending in a literal backslash immediately
// before a separator pipe (e.g. `foo\\|bar`) is treated as an escaped pipe
// rather than a column separator. Write `\|` only to escape a pipe character;
// avoid a trailing `\` at the end of a cell value.
const UNESCAPED_PIPE = /(?<!\\)\|/

export function pipeRows(opts: PipeRowsOptions): ContentModel<PipeRowsData> {
  const required = opts.columns.length - (opts.optionalColumns ?? 0)
  return {
    kind: 'rows',
    describe: () =>
      `List rows: \`- ${opts.columns.join(' | ')}\`${opts.optionalColumns ? ` (last ${opts.optionalColumns} optional)` : ''}`,
    parse(node, report) {
      const rows: Array<Record<string, string>> = []
      const bodyLines = node.body.split('\n')
      for (let i = 0; i < bodyLines.length; i++) {
        const line = bodyLines[i]
        if (line.trim() === '') continue
        const m = line.match(ROW_RE)
        if (!m) {
          report({
            code: 'CB_ROW_SYNTAX',
            severity: 'warning',
            message: `:::${node.name} rows must start with "- ". Ignored: "${line.trim()}".`,
            blockName: node.name,
            position: bodyLineRange(node, i),
          })
          continue
        }
        const cells = m[1].split(UNESCAPED_PIPE).map((c) => c.replace(/\\\|/g, '|').trim())
        if (cells.length < required || cells.length > opts.columns.length) {
          report({
            code: 'CB_ROW_COLUMNS',
            severity: 'error',
            message: `:::${node.name} rows require ${opts.columns.length} columns (${opts.columns.join(' | ')}). Found ${cells.length}.`,
            hint: `Format: - ${opts.columns.join(' | ')}`,
            blockName: node.name,
            position: bodyLineRange(node, i),
          })
          continue
        }
        const row: Record<string, string> = {}
        opts.columns.forEach((col, idx) => {
          row[col] = cells[idx] ?? ''
        })
        rows.push(row)
      }
      if (opts.minRows !== undefined && rows.length < opts.minRows) {
        report(
          blockDiag(
            node,
            'CB_ROW_COUNT',
            `:::${node.name} needs at least ${opts.minRows} rows, found ${rows.length}.`,
          ),
        )
      }
      if (opts.maxRows !== undefined && rows.length > opts.maxRows) {
        report(
          blockDiag(
            node,
            'CB_ROW_COUNT',
            `:::${node.name} allows at most ${opts.maxRows} rows, found ${rows.length}.`,
          ),
        )
      }
      return { rows }
    },
  }
}

/* ── listItems ── */

export interface ListItemsOptions {
  /** signed = lines starting with `+ ` or `- ` (e.g. pros-cons). */
  marker: 'bullet' | 'ordered' | 'signed'
  minItems?: number
  maxItems?: number
}

export interface ListItem {
  text: string
  sign?: '+' | '-'
}

export interface ListItemsData {
  items: ListItem[]
}

const MARKERS: Record<ListItemsOptions['marker'], RegExp> = {
  bullet: /^\s*-\s+(.*)$/,
  ordered: /^\s*\d+[.)]\s+(.*)$/,
  signed: /^\s*([+-])\s+(.*)$/,
}

export function listItems(opts: ListItemsOptions): ContentModel<ListItemsData> {
  return {
    kind: 'list',
    describe: () =>
      opts.marker === 'ordered'
        ? 'Ordered list: `1. item`'
        : opts.marker === 'signed'
          ? 'Signed list: `+ positive` / `- negative`'
          : 'Bullet list: `- item`',
    parse(node, report) {
      const items: ListItem[] = []
      const bodyLines = node.body.split('\n')
      for (let i = 0; i < bodyLines.length; i++) {
        const line = bodyLines[i]
        if (line.trim() === '') continue
        const m = line.match(MARKERS[opts.marker])
        if (!m) {
          report({
            code: 'CB_ITEM_SYNTAX',
            severity: 'warning',
            message: `:::${node.name} expects ${opts.marker} list items. Ignored: "${line.trim()}".`,
            blockName: node.name,
            position: bodyLineRange(node, i),
          })
          continue
        }
        if (opts.marker === 'signed') items.push({ text: m[2], sign: m[1] as '+' | '-' })
        else items.push({ text: m[1] })
      }
      if (opts.minItems !== undefined && items.length < opts.minItems) {
        report(
          blockDiag(
            node,
            'CB_ITEM_COUNT',
            `:::${node.name} needs at least ${opts.minItems} items, found ${items.length}.`,
          ),
        )
      }
      if (opts.maxItems !== undefined && items.length > opts.maxItems) {
        report(
          blockDiag(
            node,
            'CB_ITEM_COUNT',
            `:::${node.name} allows at most ${opts.maxItems} items, found ${items.length}.`,
          ),
        )
      }
      return { items }
    },
  }
}

/* ── childBlocks ── */

export interface ChildBlocksOptions {
  allowed: string[]
  required?: string[]
  minChildren?: number
  maxChildren?: number
}

export interface ChildBlocksData {
  blocks: BlockNode[]
}

export function childBlocks(opts: ChildBlocksOptions): ContentModel<ChildBlocksData> {
  return {
    kind: 'children',
    describe: () => `Child blocks: ${opts.allowed.map((n) => `\`::${n}\``).join(', ')}`,
    parse(node, report: Report) {
      const blocks: BlockNode[] = []
      for (const child of node.children) {
        if (child.type === 'markdown') {
          if (child.value.trim() !== '') {
            report({
              code: 'CB_UNEXPECTED_CONTENT',
              severity: 'warning',
              message: `:::${node.name} only accepts ${opts.allowed.map((n) => `::${n}`).join(', ')} children; loose text is ignored.`,
              blockName: node.name,
              position: child.position,
            })
          }
          continue
        }
        if (!opts.allowed.includes(child.name)) {
          report({
            code: 'CB_CHILD_NOT_ALLOWED',
            severity: 'error',
            message: `"::${child.name}" is not allowed inside :::${node.name}. Allowed: ${opts.allowed.join(', ')}.`,
            blockName: node.name,
            position: child.openPosition,
          })
          continue
        }
        blocks.push(child)
      }
      for (const name of opts.required ?? []) {
        if (!blocks.some((b) => b.name === name)) {
          report(blockDiag(node, 'CB_CHILD_MISSING', `:::${node.name} requires a ::${name} child.`))
        }
      }
      const count = blocks.length
      if (opts.minChildren !== undefined && count < opts.minChildren) {
        report(
          blockDiag(
            node,
            'CB_CHILD_COUNT',
            `:::${node.name} needs at least ${opts.minChildren} children, found ${count}.`,
          ),
        )
      }
      if (opts.maxChildren !== undefined && count > opts.maxChildren) {
        report(
          blockDiag(
            node,
            'CB_CHILD_COUNT',
            `:::${node.name} allows at most ${opts.maxChildren} children, found ${count}.`,
          ),
        )
      }
      return { blocks }
    },
  }
}
