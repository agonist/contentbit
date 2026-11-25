import { normalizeSource } from './source.js'

// A YAML frontmatter block at the very start of the file: an opening ---
// fence, an optional body (empty frontmatter is legal), and a closing ---
// fence. Both fences tolerate trailing spaces/tabs, which editors and CMS
// exports routinely leave behind.
const FM_RE = /^---[ \t]*\n(?:[\s\S]*?\n)?---[ \t]*(?:\n|$)/

/**
 * Blank out a leading YAML frontmatter block so block syntax inside it is
 * never parsed as content. Every line is replaced by an empty line (the
 * newlines stay), so diagnostic positions in the remaining document are
 * unchanged. The result has LF line endings and no byte order mark, the form
 * `parseDocument` reads. Sources without frontmatter are otherwise unchanged.
 */
export function stripFrontmatter(source: string): string {
  const text = normalizeSource(source)
  const match = FM_RE.exec(text)
  if (!match) return text
  return match[0].replace(/[^\n]+/g, '') + text.slice(match[0].length)
}

export interface Frontmatter {
  /** Raw YAML between the fences (fences excluded). */
  raw: string
  /** Best-effort parsed data; values the subset parser can't handle stay raw strings. */
  data: Record<string, unknown>
  /** Top-level keys in document order. */
  keys: string[]
  /** 1-based fence lines, inclusive. */
  lines: { start: number; end: number }
}

/**
 * Extract and parse a leading YAML frontmatter block. Parsing covers the flat
 * subset real content frontmatter uses: `key: value` scalars (quoted/plain
 * strings, numbers, booleans, null), inline arrays, dash lists, and block
 * scalars. Nested mappings and anything else fall back to the raw text of the
 * value, so no input ever throws. Returns null when there is no frontmatter.
 */
export function extractFrontmatter(source: string): Frontmatter | null {
  const match = normalizeSource(source).match(FM_RE)
  if (!match) return null
  const blockLines = match[0].replace(/\n$/, '').split('\n')
  const inner = blockLines.slice(1, -1)
  const { data, keys } = parseYamlSubset(inner)
  return { raw: inner.join('\n'), data, keys, lines: { start: 1, end: blockLines.length } }
}

// YAML needs whitespace after a key's colon, so `https://x` is a scalar.
const KEY_RE = /^([A-Za-z0-9_.-]+):(?=[ \t]|$)(.*)$/

/** Split a `key: value` line; the value loses its trailing comment. */
function matchKey(line: string): { key: string; value: string } | null {
  const m = line.match(KEY_RE)
  return m ? { key: m[1], value: stripComment(m[2]).trim() } : null
}

// A quote opens a quoted scalar only where a scalar can start, so the
// apostrophe in `Don't` is plain text.
const SCALAR_START_RE = /(?:^|[[{,:])[ \t]*$/

/** Cut a YAML comment: a `#` at the start or after whitespace, outside quotes. */
function stripComment(value: string): string {
  let quote: '"' | "'" | null = null
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (quote === '"') {
      if (ch === '\\') i++
      else if (ch === '"') quote = null
    } else if (quote === "'") {
      if (ch === "'" && value[i + 1] === "'") i++
      else if (ch === "'") quote = null
    } else if (ch === '#' && (i === 0 || value[i - 1] === ' ' || value[i - 1] === '\t')) {
      return value.slice(0, i)
    } else if ((ch === '"' || ch === "'") && SCALAR_START_RE.test(value.slice(0, i))) {
      quote = ch
    }
  }
  return value
}

// The lines after a key that belong to its value: indented lines and, for an
// empty value, dash-list items at the key's own indentation, which YAML allows
// and PyYAML writes (`tags:\n- a\n- b`).
function isChildLine(line: string, value: string): boolean {
  if (line.trim() === '') return false
  return /^[ \t]/.test(line) || (value === '' && line.startsWith('- '))
}

function parseYamlSubset(lines: string[]): { data: Record<string, unknown>; keys: string[] } {
  const data: Record<string, unknown> = {}
  const keys: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#') || /^[ \t]/.test(line)) {
      i++
      continue
    }
    const entry = matchKey(line)
    if (!entry) {
      i++
      continue
    }
    const { key, value } = entry
    i++
    const indented: string[] = []
    while (i < lines.length && isChildLine(lines[i], value)) {
      indented.push(lines[i])
      i++
    }
    keys.push(key)
    data[key] = parseValue(value, indented)
  }
  return { data, keys }
}

function parseValue(value: string, indented: string[]): unknown {
  if (/^[|>][+-]?$/.test(value)) return dedent(indented).join('\n')
  if (value === '') {
    if (indented.length === 0) return null
    const items = dedent(indented)
    const list = parseDashList(items)
    if (list) return list
    const mapping = parseNestedMapping(items)
    if (mapping) return mapping
    return items.join('\n')
  }
  return parseScalar(value)
}

// A small nested mapping parser for common frontmatter shapes: `key: scalar`,
// inline arrays, and one-more-level dash lists. Returns null if the block uses
// YAML we do not understand, so the caller keeps the raw-text fallback.
function parseNestedMapping(items: string[]): Record<string, unknown> | null {
  const out: Record<string, unknown> = {}
  let i = 0
  while (i < items.length) {
    const line = items[i]
    if (/^[ \t]/.test(line)) return null
    const entry = matchKey(line)
    if (!entry) return null
    const { key, value } = entry
    i++
    if (value !== '') {
      out[key] = parseScalar(value)
      continue
    }

    const childLines: string[] = []
    while (i < items.length && isChildLine(items[i], value)) {
      childLines.push(items[i])
      i++
    }
    if (childLines.length === 0) {
      out[key] = null
      continue
    }

    const nested = dedent(childLines)
    const list = parseDashList(nested)
    if (list) out[key] = list
    else return null
  }
  return Object.keys(out).length > 0 ? out : null
}

function parseDashList(items: string[]): unknown[] | null {
  const groups: string[][] = []
  let current: string[] | null = null
  for (const line of items) {
    if (line.startsWith('- ')) {
      if (current) groups.push(current)
      current = [line.slice(2)]
    } else if (current && /^[ \t]/.test(line)) {
      current.push(line)
    } else {
      return null
    }
  }
  if (current) groups.push(current)
  return groups.map((group) => parseDashItem(group))
}

function parseDashItem(lines: string[]): unknown {
  const first = stripComment(lines[0]).trim()
  if (lines.length === 1) return parseNestedMapping([first]) ?? parseScalar(first)
  const rest = dedent(lines.slice(1))
  const mapping = parseNestedMapping([first, ...rest])
  return mapping ?? lines.join('\n')
}

function dedent(lines: string[]): string[] {
  const indent = Math.min(...lines.map((l) => l.match(/^[ \t]*/)![0].length))
  return lines.map((l) => l.slice(indent))
}

function parseScalar(value: string): unknown {
  if (value === '' || value === 'null' || value === '~') return null
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^[+-]?\d+$/.test(value)) return Number.parseInt(value, 10)
  if (/^[+-]?\d*\.\d+$/.test(value)) return Number.parseFloat(value)
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try {
      return JSON.parse(value) as string
    } catch {
      return value.slice(1, -1)
    }
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replace(/''/g, "'")
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim()
    if (inner === '') return []
    return splitInlineItems(inner).map((item) => parseScalar(item.trim()))
  }
  if (value.startsWith('{') && value.endsWith('}')) {
    const inner = value.slice(1, -1).trim()
    if (inner === '') return {}
    const out: Record<string, unknown> = {}
    for (const item of splitInlineItems(inner)) {
      const m = item.trim().match(KEY_RE)
      if (!m) return value
      const [, key, rawValue] = m
      out[key] = parseScalar(rawValue.trim())
    }
    return out
  }
  return value
}

/** Split inline array items on top-level commas, respecting quotes. */
function splitInlineItems(inner: string): string[] {
  const items: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (const ch of inner) {
    if (quote) {
      current += ch
      if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") {
      current += ch
      quote = ch
    } else if (ch === ',') {
      items.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  items.push(current)
  return items
}
