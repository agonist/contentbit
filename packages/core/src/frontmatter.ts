// A YAML frontmatter block at the very start of the file: an opening ---
// fence, an optional body (empty frontmatter is legal), and a closing ---
// fence. Both fences tolerate trailing spaces/tabs, which editors and CMS
// exports routinely leave behind.
const FM_RE = /^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/

/**
 * Blank out a leading YAML frontmatter block so block syntax inside it is
 * never parsed as content. Every line is replaced by an empty line (the
 * newlines stay), so diagnostic positions in the remaining document are
 * unchanged. Sources without frontmatter are returned as-is.
 */
export function stripFrontmatter(source: string): string {
  const match = FM_RE.exec(source)
  if (!match) return source
  return match[0].replace(/[^\n]+/g, '') + source.slice(match[0].length)
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
  const match = source.match(FM_RE)
  if (!match) return null
  const blockLines = match[0].replace(/\r?\n$/, '').split(/\r?\n/)
  const inner = blockLines.slice(1, -1)
  const { data, keys } = parseYamlSubset(inner)
  return { raw: inner.join('\n'), data, keys, lines: { start: 1, end: blockLines.length } }
}

const KEY_RE = /^([A-Za-z0-9_.-]+):(.*)$/

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
    const m = line.match(KEY_RE)
    if (!m) {
      i++
      continue
    }
    const [, key, rawValue] = m
    const value = rawValue.trim()
    i++
    const indented: string[] = []
    while (i < lines.length && /^[ \t]/.test(lines[i]) && lines[i].trim() !== '') {
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

// A one-level mapping: every dedented line is `key: scalar` (or `key:` with an
// inline array value). Returns null if any line isn't a flat mapping entry —
// e.g. a deeper-indented line or a `key:` with no inline value, which would
// need its own nested block — so the caller keeps the raw-text fallback.
function parseNestedMapping(items: string[]): Record<string, unknown> | null {
  const out: Record<string, unknown> = {}
  for (const line of items) {
    if (/^[ \t]/.test(line)) return null
    const m = line.match(KEY_RE)
    if (!m) return null
    const [, key, rawValue] = m
    const v = rawValue.trim()
    if (v === '') return null
    out[key] = parseScalar(v)
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
  const first = lines[0].trim()
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
