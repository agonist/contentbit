import type { Diagnostic, Severity } from '@contentbit/core'
import { isAbsolute, relative } from 'node:path'

type Tone = 'error' | 'warning' | 'info' | 'success' | 'muted'

const ANSI: Record<Tone | 'bold', [string, string]> = {
  bold: ['\u001b[1m', '\u001b[22m'],
  error: ['\u001b[31m', '\u001b[39m'],
  warning: ['\u001b[33m', '\u001b[39m'],
  info: ['\u001b[36m', '\u001b[39m'],
  success: ['\u001b[32m', '\u001b[39m'],
  muted: ['\u001b[2m', '\u001b[22m'],
}

interface Row {
  label: string
  value: string | number
  tone?: Tone
}

export function color(text: string, tone: Tone | 'bold'): string {
  if (!colorsEnabled()) return text
  const [open, close] = ANSI[tone]
  return `${open}${text}${close}`
}

export function section(title: string): string {
  return color(title, 'bold')
}

export function formatRows(rows: Row[]): string[] {
  const width = Math.max(...rows.map((row) => row.label.length))
  return rows.map((row) => {
    const value = String(row.value)
    return `  ${color(row.label.padEnd(width), 'muted')}  ${
      row.tone ? color(value, row.tone) : value
    }`
  })
}

export function formatCommandList(commands: string[]): string[] {
  return commands.map((command) => `  ${color('$', 'muted')} ${command}`)
}

export function formatDiagnosticForCli(diagnostic: Diagnostic, file: string): string {
  const location = `${displayPath(file)}:${diagnostic.position.start.line}:${diagnostic.position.start.column}`
  const lines = [
    `${color(location, 'muted')} ${severityLabel(diagnostic.severity)} ${diagnostic.code}`,
    `  ${diagnostic.message}`,
  ]
  if (diagnostic.hint) lines.push(`  ${color('hint', 'muted')} ${diagnostic.hint}`)
  return lines.join('\n')
}

export function displayPath(file: string): string {
  const path = relative(process.cwd(), file)
  if (path && !path.startsWith('..') && !isAbsolute(path)) return path
  return file
}

export function severityLabel(severity: Severity): string {
  return color(severity, severityTone(severity))
}

export function severityTone(severity: Severity): Tone {
  if (severity === 'error') return 'error'
  if (severity === 'warning') return 'warning'
  return 'info'
}

function colorsEnabled(): boolean {
  if (process.env.VITEST || process.env.NODE_ENV === 'test') return false
  if ('NO_COLOR' in process.env || process.env.FORCE_COLOR === '0') return false
  if (process.env.FORCE_COLOR) return true
  return Boolean(process.stdout.isTTY)
}
