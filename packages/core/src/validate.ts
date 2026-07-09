import type { BlockNode, ContentNode, DocumentNode } from './ast.js'
import type { Diagnostic, SourceRange } from './diagnostics.js'
import type { ParseResult } from './parser.js'
import type { BlockDefinition, BlockRegistry } from './registry.js'
import type { ZodType } from 'zod'

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

interface ZodObjectDef {
  type: string
  shape?: Record<string, unknown>
  catchall?: ZodLike
}

interface ZodLike {
  def: ZodObjectDef
}

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

function knownPropNames(schema: ZodType | undefined): string[] | undefined {
  if (!schema) return []
  const root = (schema as unknown as ZodLike).def
  if (root.type !== 'object' || !root.shape) return undefined
  if (root.catchall && root.catchall.def.type !== 'never') return undefined
  return Object.keys(root.shape)
}

function knownItems(label: string, names: string[]): string {
  return names.length > 0 ? `Known ${label}: ${names.join(', ')}.` : `No ${label} are registered.`
}

function unknownPropHint(prop: string, known: string[]): string {
  const suggestion = closest(prop, known)
  const knownHint =
    known.length > 0 ? `Known props: ${known.join(', ')}.` : 'This block does not accept props.'
  return suggestion ? `Did you mean "${suggestion}"? ${knownHint}` : knownHint
}

function reportUnknownProps(
  node: BlockNode,
  def: BlockDefinition<unknown>,
  report: (d: Diagnostic) => void,
): boolean {
  const known = knownPropNames(def.props)
  if (!known) return true

  let valid = true
  for (const prop of Object.keys(node.props)) {
    if (known.includes(prop)) continue
    valid = false
    report({
      code: 'CB_UNKNOWN_PROP',
      severity: 'error',
      message: `${node.name}: unknown prop "${prop}".`,
      hint: unknownPropHint(prop, known),
      blockName: node.name,
      position: node.openPosition,
    })
  }
  return valid
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

function closest(target: string, candidates: string[]): string | undefined {
  let best: string | undefined
  let bestD = Infinity
  for (const candidate of candidates) {
    const distance = editDistance(target, candidate)
    if (distance < bestD) {
      bestD = distance
      best = candidate
    }
  }
  return best && bestD <= Math.max(2, Math.floor(target.length / 3)) ? best : undefined
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
        const knownBlocks = registry.all().map((d) => d.name)
        const suggestion = closest(node.name, knownBlocks)
        report({
          code: 'CB_UNKNOWN_BLOCK',
          severity: opts.unknownBlocks,
          message: `Unknown block "${node.name}".`,
          hint: suggestion
            ? `Did you mean "${suggestion}"? ${knownItems('blocks', knownBlocks)}`
            : knownItems('blocks', knownBlocks),
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

      if (!reportUnknownProps(node, def, report)) valid = false

      if (def.props) {
        const result = def.props.safeParse(node.props)
        if (result.success) {
          node.props = result.data as Record<string, unknown>
        } else {
          valid = false
          for (const issue of result.error.issues) {
            if (issue.code === 'unrecognized_keys') continue
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
