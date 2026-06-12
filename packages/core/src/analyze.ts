import type { ContentNode } from './ast.js'

import { extractFrontmatter, stripFrontmatter } from './frontmatter.js'
import { parseDocument } from './parser.js'

export interface OutlineEntry {
  /** ATX heading level, 1-6. */
  level: number
  text: string
  /** 1-based source line. */
  line: number
  /** Prose words from this heading (inclusive) until the next heading of any level. */
  words: number
}

export interface BlockInstance {
  name: string
  /** 1-based line of the opening fence. */
  line: number
  /** 1 for top-level blocks, +1 per nesting level. */
  depth: number
}

export interface LinkItem {
  url: string
  text: string
  line: number
  external: boolean
}

export interface DocumentStats {
  file: { path: string | null; bytes: number; lines: number }
  frontmatter: {
    present: boolean
    keys: string[]
    data: Record<string, unknown>
    lines: { start: number; end: number } | null
  }
  length: {
    /** Prose words only: frontmatter, code, and markup syntax are excluded. */
    words: number
    /** Characters of the full source, frontmatter included. */
    characters: number
    /** ceil(words / 200). */
    readingMinutes: number
    /** Rough heuristic: ceil(characters / 4). */
    approxTokens: number
  }
  outline: OutlineEntry[]
  blocks: {
    total: number
    byName: Record<string, number>
    maxDepth: number
    instances: BlockInstance[]
  }
  links: {
    total: number
    external: number
    internal: number
    domains: string[]
    items: LinkItem[]
  }
  images: { total: number; missingAlt: number }
  code: { fences: number; languages: string[]; inlineSpans: number }
  structure: { listItems: number; tables: number; blockquotes: number }
}

export interface AnalyzeOptions {
  /** Reported back in `file.path`; analyze never touches the filesystem. */
  path?: string
}

/** UTF-8 byte length without Node Buffer or TextEncoder (core is environment-agnostic). */
function utf8Length(source: string): number {
  let bytes = 0
  for (const ch of source) {
    const cp = ch.codePointAt(0) as number
    bytes += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4
  }
  return bytes
}

const CODE_FENCE_RE = /^(`{3,}|~{3,})(.*)$/
const HEADING_RE = /^(#{1,6})\s+(.*)$/
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s+/
const TABLE_SEPARATOR_RE = /^\|?[\s:|-]+$/
const CODE_SPAN_RE = /`[^`]+`/g
const IMAGE_RE = /!\[([^\]]*)\]\(([^)]*)\)/g
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
const AUTOLINK_RE = /<(https?:\/\/[^>\s]+)>/g
const EXTERNAL_URL_RE = /^(?:https?:)?\/\//i

/**
 * Scan a document and return structured stats: prose length, heading outline,
 * block census, links, images, code, and structure counts. Purely syntactic
 * and deterministic — no registry, no validation, no filesystem access.
 */
export function analyzeDocument(source: string, options: AnalyzeOptions = {}): DocumentStats {
  const frontmatter = extractFrontmatter(source)
  const { document } = parseDocument(stripFrontmatter(source))

  const outline: OutlineEntry[] = []
  const blocks: DocumentStats['blocks'] = { total: 0, byName: {}, maxDepth: 0, instances: [] }
  const links: DocumentStats['links'] = {
    total: 0,
    external: 0,
    internal: 0,
    domains: [],
    items: [],
  }
  const images: DocumentStats['images'] = { total: 0, missingAlt: 0 }
  const code: DocumentStats['code'] = { fences: 0, languages: [], inlineSpans: 0 }
  const structure: DocumentStats['structure'] = { listItems: 0, tables: 0, blockquotes: 0 }
  const languages = new Set<string>()
  const domains = new Set<string>()
  let words = 0

  function addWords(count: number): void {
    words += count
    const section = outline[outline.length - 1]
    if (section) section.words += count
  }

  function recordLink(url: string, text: string, line: number): void {
    const external = EXTERNAL_URL_RE.test(url)
    links.total++
    if (external) {
      links.external++
      const host = url.match(/^(?:https?:)?\/\/(?:[^/?#@]*@)?([^/?#:]+)/i)
      if (host) domains.add(host[1].toLowerCase())
    } else {
      links.internal++
    }
    links.items.push({ url, text, line, external })
  }

  /** Replace inline markup with its prose equivalent, recording links/images/spans. */
  function inlineToProse(text: string, line: number): string {
    return text
      .replace(CODE_SPAN_RE, () => {
        code.inlineSpans++
        return ' '
      })
      .replace(IMAGE_RE, (_, alt: string) => {
        images.total++
        if (alt.trim() === '') images.missingAlt++
        return ' '
      })
      .replace(LINK_RE, (_, label: string, url: string) => {
        recordLink(url, label, line)
        return label
      })
      .replace(AUTOLINK_RE, (_, url: string) => {
        recordLink(url, url, line)
        return ' '
      })
  }

  function countWords(text: string): number {
    return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length
  }

  function scanMarkdown(value: string, startLine: number): void {
    let fence: string | null = null
    let inBlockquote = false
    let prevLineHasPipe = false
    const lines = value.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNo = startLine + i
      const trimmed = line.trim()

      const fenceMatch = trimmed.match(CODE_FENCE_RE)
      if (fence !== null) {
        if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) {
          fence = null
        }
        continue
      }
      if (fenceMatch) {
        fence = fenceMatch[1]
        code.fences++
        const lang = fenceMatch[2].trim().split(/\s+/)[0]
        if (lang) languages.add(lang)
        inBlockquote = false
        prevLineHasPipe = false
        continue
      }

      if (trimmed === '') {
        inBlockquote = false
        prevLineHasPipe = false
        continue
      }

      const heading = trimmed.match(HEADING_RE)
      if (heading) {
        const raw = heading[2].replace(/\s+#+\s*$/, '')
        const text = inlineToProse(raw, lineNo).replace(/\s+/g, ' ').trim()
        outline.push({ level: heading[1].length, text, line: lineNo, words: 0 })
        addWords(countWords(text))
        inBlockquote = false
        prevLineHasPipe = false
        continue
      }

      let content = trimmed
      if (content.startsWith('>')) {
        if (!inBlockquote) {
          structure.blockquotes++
          inBlockquote = true
        }
        content = content.replace(/^(>\s*)+/, '')
      } else {
        inBlockquote = false
      }

      if (LIST_ITEM_RE.test(content)) {
        structure.listItems++
        content = content.replace(LIST_ITEM_RE, '')
      }

      if (content.includes('|')) {
        if (TABLE_SEPARATOR_RE.test(content) && content.includes('-') && prevLineHasPipe) {
          structure.tables++
        }
        prevLineHasPipe = true
        content = inlineToProse(content, lineNo).replaceAll('|', ' ')
      } else {
        prevLineHasPipe = false
        content = inlineToProse(content, lineNo)
      }

      addWords(countWords(content))
    }
  }

  function walk(nodes: ContentNode[], depth: number): void {
    for (const node of nodes) {
      if (node.type === 'block') {
        blocks.total++
        blocks.byName[node.name] = (blocks.byName[node.name] ?? 0) + 1
        blocks.maxDepth = Math.max(blocks.maxDepth, depth)
        blocks.instances.push({ name: node.name, line: node.openPosition.start.line, depth })
        walk(node.children, depth + 1)
      } else {
        scanMarkdown(node.value, node.position.start.line)
      }
    }
  }
  walk(document.children, 1)

  code.languages = [...languages]
  links.domains = [...domains].sort()

  const sourceLines =
    source === '' ? 0 : source.split('\n').length - (source.endsWith('\n') ? 1 : 0)

  return {
    file: {
      path: options.path ?? null,
      bytes: utf8Length(source),
      lines: sourceLines,
    },
    frontmatter: frontmatter
      ? {
          present: true,
          keys: frontmatter.keys,
          data: frontmatter.data,
          lines: frontmatter.lines,
        }
      : { present: false, keys: [], data: {}, lines: null },
    length: {
      words,
      characters: source.length,
      readingMinutes: Math.ceil(words / 200),
      approxTokens: Math.ceil(source.length / 4),
    },
    outline,
    blocks,
    links,
    images,
    code,
    structure,
  }
}
