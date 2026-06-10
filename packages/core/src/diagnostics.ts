export interface SourcePoint {
  /** 1-based */
  line: number
  /** 1-based */
  column: number
  /** 0-based char offset into the source string */
  offset: number
}

export interface SourceRange {
  start: SourcePoint
  end: SourcePoint
}

export type Severity = 'error' | 'warning' | 'info'

export interface Diagnostic {
  code: string
  severity: Severity
  message: string
  hint?: string
  blockName?: string
  position: SourceRange
}

export function formatDiagnostic(d: Diagnostic, file = 'content.md'): string {
  const head = `${file}:${d.position.start.line}:${d.position.start.column} ${d.severity} ${d.code}`
  const lines = [head, d.message]
  if (d.hint) lines.push(`hint: ${d.hint}`)
  return lines.join('\n')
}
