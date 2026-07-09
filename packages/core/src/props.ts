import type { Diagnostic, SourcePoint, SourceRange } from './diagnostics.js'

const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_-]*/
const NUMBER_RE = /^-?\d+(\.\d+)?$/
const IDENT_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/

export interface ParsedProps {
  props: Record<string, unknown>
  propPositions: Record<string, SourceRange>
  diagnostics: Diagnostic[]
}

/**
 * Parses the `{...}` props segment of a block open line.
 * Grammar: key="quoted" | key=123 | key=true | key=bare-ident | key (flag = true).
 * No expressions, arrays, or objects — by design (spec: Content Syntax / Props).
 */
export function parseProps(
  raw: string | null,
  position: SourceRange,
  rawStart: SourcePoint = position.start,
): ParsedProps {
  const props: Record<string, unknown> = {}
  const propPositions: Record<string, SourceRange> = {}
  const diagnostics: Diagnostic[] = []
  if (raw === null) return { props, propPositions, diagnostics }

  const err = (message: string) =>
    diagnostics.push({
      code: 'CB_PROPS_SYNTAX',
      severity: 'error',
      message,
      hint: 'Props accept quoted strings, numbers, booleans, and bare identifiers only.',
      position,
    })

  if (!raw.endsWith('}')) {
    return {
      props: {},
      propPositions,
      diagnostics: [
        {
          code: 'CB_PROPS_SYNTAX',
          severity: 'error',
          message: 'Props are missing the closing "}".',
          hint: 'Props accept quoted strings, numbers, booleans, and bare identifiers only.',
          position,
        },
      ],
    }
  }

  const inner = raw.slice(1, -1)
  const innerOffset = rawStart.offset + 1
  const innerColumn = rawStart.column + 1
  let i = 0
  while (i < inner.length) {
    while (i < inner.length && /\s/.test(inner[i])) i++
    if (i >= inner.length) break

    const keyMatch = inner.slice(i).match(KEY_RE)
    if (!keyMatch) {
      err(`Unexpected character "${inner[i]}" in props.`)
      return { props, propPositions, diagnostics }
    }
    const keyStart = i
    const key = keyMatch[0]
    propPositions[key] = {
      start: {
        line: rawStart.line,
        column: innerColumn + keyStart,
        offset: innerOffset + keyStart,
      },
      end: {
        line: rawStart.line,
        column: innerColumn + keyStart + key.length,
        offset: innerOffset + keyStart + key.length,
      },
    }
    i += key.length

    if (inner[i] !== '=') {
      props[key] = true // flag shorthand
      continue
    }
    i++

    if (inner[i] === '"') {
      i++
      let value = ''
      let closed = false
      while (i < inner.length) {
        if (inner[i] === '\\' && inner[i + 1] === '"') {
          value += '"'
          i += 2
          continue
        }
        if (inner[i] === '"') {
          closed = true
          i++
          break
        }
        value += inner[i]
        i++
      }
      if (!closed) {
        err(`Unterminated string for prop "${key}".`)
        return { props, propPositions, diagnostics }
      }
      props[key] = value
      continue
    }

    const valMatch = inner.slice(i).match(/^[^\s]+/)
    if (!valMatch) {
      err(`Missing value for prop "${key}".`)
      return { props, propPositions, diagnostics }
    }
    const rawVal = valMatch[0]
    i += rawVal.length
    if (rawVal === 'true') props[key] = true
    else if (rawVal === 'false') props[key] = false
    else if (NUMBER_RE.test(rawVal)) props[key] = Number(rawVal)
    else if (IDENT_RE.test(rawVal)) props[key] = rawVal
    else err(`Invalid value "${rawVal}" for prop "${key}".`)
  }
  return { props, propPositions, diagnostics }
}
