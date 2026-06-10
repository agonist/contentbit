import type { BlockDefinition } from './registry.js'

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
