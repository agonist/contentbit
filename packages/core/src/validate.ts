import type { BlockNode, ContentNode, DocumentNode } from './ast.js'
import type { Diagnostic, SourceRange } from './diagnostics.js'
import type { ParseResult } from './parser.js'
import type { BlockDefinition, BlockRegistry } from './registry.js'

export interface ValidateOptions {
  /** Severity of unknown block names. Default "error". */
  unknownBlocks?: 'error' | 'warning'
  /** Max block nesting depth. Default 4. */
  maxDepth?: number
  /** URL protocols allowed in markdown links. Default http/https/mailto. */
  allowedProtocols?: string[]
}

export interface ValidationResult {
  ok: boolean
  document: ValidatedDocumentNode
  diagnostics: Diagnostic[]
}

export type ValidatedDocumentNode = DocumentNode & {
  readonly __contentbitValidatedDocument: true
}

export type ValidatedBlockNode<TData = unknown> = BlockNode & {
  data: TData
  definition: BlockDefinition<TData>
}

export function isValidatedDocument(document: DocumentNode): document is ValidatedDocumentNode {
  return (document as Partial<ValidatedDocumentNode>).__contentbitValidatedDocument === true
}

export function isValidatedBlock(node: ContentNode): node is ValidatedBlockNode {
  return node.type === 'block' && 'data' in node && 'definition' in node
}

const LINK_URL_RE = /\]\(([^)\s]+)/g
const HAS_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

function checkUrls(
  value: string,
  position: SourceRange,
  allowed: string[],
  report: (d: Diagnostic) => void,
): void {
  for (const match of value.matchAll(LINK_URL_RE)) {
    const url = match[1]
    const scheme = url.match(HAS_SCHEME_RE)
    if (!scheme) continue // relative URLs are fine
    const protocol = `${scheme[0].slice(0, -1).toLowerCase()}:`
    if (!allowed.includes(protocol)) {
      report({
        code: 'CB_URL_PROTOCOL',
        severity: 'error',
        message: `URL protocol "${protocol}" is not allowed.`,
        hint: `Allowed: ${allowed.join(', ')}. Configure via validateDocument options.allowedProtocols.`,
        position,
      })
    }
  }
}

export function validateDocument(
  parsed: ParseResult,
  registry: BlockRegistry,
  options: ValidateOptions = {},
): ValidationResult {
  const opts = {
    unknownBlocks: options.unknownBlocks ?? 'error',
    maxDepth: options.maxDepth ?? 4,
    allowedProtocols: options.allowedProtocols ?? ['http:', 'https:', 'mailto:'],
  }
  const diagnostics: Diagnostic[] = [...parsed.diagnostics]
  const report = (d: Diagnostic) => diagnostics.push(d)

  function walk(nodes: ContentNode[], parent: BlockNode | null, depth: number): void {
    for (const node of nodes) {
      if (node.type === 'markdown') {
        checkUrls(node.value, node.position, opts.allowedProtocols, report)
        continue
      }
      if (depth > opts.maxDepth) {
        report({
          code: 'CB_NESTING_DEPTH',
          severity: 'error',
          message: `Block "${node.name}" exceeds the maximum nesting depth of ${opts.maxDepth}.`,
          blockName: node.name,
          position: node.openPosition,
        })
        continue
      }
      const def = registry.get(node.name)
      if (!def) {
        report({
          code: 'CB_UNKNOWN_BLOCK',
          severity: opts.unknownBlocks,
          message: `Unknown block "${node.name}".`,
          hint: `Known blocks: ${registry
            .all()
            .map((d) => d.name)
            .join(', ')}.`,
          blockName: node.name,
          position: node.openPosition,
        })
        continue
      }
      let valid = true
      if (def.childOnly && parent === null) {
        valid = false
        report({
          code: 'CB_CHILD_ONLY',
          severity: 'error',
          message: `"${node.name}" is a child block and cannot be used at the top level.`,
          blockName: node.name,
          position: node.openPosition,
        })
      }

      if (def.props) {
        const result = def.props.safeParse(node.props)
        if (result.success) {
          node.props = result.data as Record<string, unknown>
        } else {
          valid = false
          for (const issue of result.error.issues) {
            report({
              code: 'CB_PROPS_INVALID',
              severity: 'error',
              message: `${node.name}: prop "${issue.path.join('.') || '(root)'}" ${issue.message}`,
              blockName: node.name,
              position: node.openPosition,
            })
          }
        }
      }

      const before = diagnostics.length
      const data = def.content.parse(node, report)
      let contentError = false
      for (let j = before; j < diagnostics.length; j++) {
        if (diagnostics[j].severity === 'error') {
          contentError = true
          break
        }
      }
      if (contentError) valid = false

      if (valid) {
        ;(node as ValidatedBlockNode).data = data
        ;(node as ValidatedBlockNode).definition = def as BlockDefinition<unknown>
      }
      walk(node.children, node, depth + 1)
    }
  }

  walk(parsed.document.children, null, 1)
  const ok = !diagnostics.some((d) => d.severity === 'error')
  return { ok, document: markValidatedDocument(parsed.document), diagnostics }
}

function markValidatedDocument(document: DocumentNode): ValidatedDocumentNode {
  if (!isValidatedDocument(document)) {
    Object.defineProperty(document, '__contentbitValidatedDocument', {
      value: true,
      enumerable: false,
    })
  }
  return document as ValidatedDocumentNode
}
