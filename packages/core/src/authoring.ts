import type { ZodType } from 'zod'

import type { BlockDefinition } from './registry.js'

/** The slice of zod v4's `def` we introspect to document props. */
interface IntrospectedDef {
  type: string
  shape?: Record<string, ZodLike>
  innerType?: ZodLike
  defaultValue?: unknown
  entries?: Record<string, string | number>
  options?: ZodLike[]
  values?: unknown[]
}

interface ZodLike {
  def: IntrospectedDef
  description?: string
}

function typeLabel(def: IntrospectedDef): string {
  switch (def.type) {
    case 'enum':
      return `one of ${Object.values(def.entries ?? {}).join('|')}`
    case 'literal':
      return `one of ${(def.values ?? []).map(String).join('|')}`
    case 'union':
      return `one of ${(def.options ?? [])
        .map((o) => typeLabel(o.def).replace(/^one of /, ''))
        .join('|')}`
    default:
      return def.type
  }
}

/** One `- name: type (required|optional[, default: x]) [— description]` line per prop. */
function describeProps(schema: ZodType): string[] {
  const root = (schema as unknown as ZodLike).def
  if (root.type !== 'object' || !root.shape) return []
  const lines: string[] = []
  for (const [name, field] of Object.entries(root.shape)) {
    // Unwrap optional/default/nullable wrappers; .describe() may sit on any layer.
    let current = field
    let optional = false
    let defaultValue: unknown
    let description = current.description
    while (['optional', 'default', 'nullable'].includes(current.def.type)) {
      optional = true
      if (current.def.type === 'default') {
        const dv = current.def.defaultValue
        defaultValue = typeof dv === 'function' ? (dv as () => unknown)() : dv
      }
      if (!current.def.innerType) break
      current = current.def.innerType
      description ??= current.description
    }
    const presence =
      defaultValue !== undefined
        ? `(optional, default: ${String(defaultValue)})`
        : optional
          ? '(optional)'
          : '(required)'
    const suffix = description ? ` — ${description}` : ''
    lines.push(`- ${name}: ${typeLabel(current.def)} ${presence}${suffix}`)
  }
  return lines
}

export interface AuthoringGuideOptions {
  audience?: 'llm' | 'human'
  includeExamples?: boolean
  includeAvoidRules?: boolean
}

const LLM_PREAMBLE = `# Content block authoring rules

- write regular Markdown by default; use blocks only when they improve scanning or structure
- never invent block names — only the blocks documented below exist
- follow each block's syntax exactly; props use {key="value"} on the open line
- close every :::block with a line containing only :::
- validate generated content and fix diagnostics rather than bypassing them
`

export function generateAuthoringGuide(
  defs: BlockDefinition<unknown>[],
  opts: AuthoringGuideOptions = {},
): string {
  const includeExamples = opts.includeExamples ?? true
  const includeAvoid = opts.includeAvoidRules ?? true
  const sections: string[] = []
  if ((opts.audience ?? 'llm') === 'llm') sections.push(LLM_PREAMBLE)

  for (const def of defs) {
    const lines: string[] = [`## ${def.name}`, '']
    lines.push(
      def.childOnly
        ? `${def.description} (child block — only inside a parent that allows it)`
        : def.description,
    )
    if (def.props) {
      const props = describeProps(def.props)
      if (props.length > 0) lines.push('', 'Props:', ...props)
    }
    lines.push('', `Content: ${def.content.describe()}`)
    if (def.authoring.useWhen.length > 0) {
      lines.push('', 'Use when:', ...def.authoring.useWhen.map((u) => `- ${u}`))
    }
    if (includeAvoid && def.authoring.avoidWhen.length > 0) {
      lines.push('', 'Avoid when:', ...def.authoring.avoidWhen.map((a) => `- ${a}`))
    }
    if (includeExamples && def.authoring.example.trim() !== '') {
      lines.push('', 'Example:', '', '```md', def.authoring.example, '```')
    }
    sections.push(lines.join('\n'))
  }
  return sections.join('\n\n') + '\n'
}
