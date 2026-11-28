import { Parser } from 'htmlparser2'

import type {
  ElementContext,
  Landmark,
  RenderedHeading,
  RenderedPageFacts,
  StructuredDataBlock,
} from './model.js'

const HEADING_LEVELS = new Map<string, RenderedHeading['level']>([
  ['h1', 1],
  ['h2', 2],
  ['h3', 3],
  ['h4', 4],
  ['h5', 5],
  ['h6', 6],
])
const LANDMARK_TAGS = new Set(['header', 'nav', 'main', 'aside', 'footer'])
const LANDMARK_ROLES = new Map<string, Landmark>([
  ['banner', 'header'],
  ['navigation', 'nav'],
  ['main', 'main'],
  ['complementary', 'aside'],
  ['contentinfo', 'footer'],
])
/** Elements whose text a reader never sees on the page. */
const HIDDEN_TEXT_TAGS = new Set(['head', 'title', 'script', 'style', 'template', 'noscript'])
const WHITESPACE = /[\t\n\f\r ]+/

interface Frame {
  name: string
  landmark?: Landmark
  visible: boolean
  svg: boolean
}

/** Text collected for an open element until it closes. */
interface Capture {
  depth: number
  parts: string[]
  finish: (text: string) => void
}

/** Reads what a built page says about itself in one streaming pass. Never throws on malformed HTML. */
export function readRenderedPageFacts(html: string): RenderedPageFacts {
  const facts: RenderedPageFacts = {
    robots: { noindex: false, nofollow: false },
    alternates: [],
    structuredData: [],
    headings: [],
    ids: [],
    links: [],
    images: [],
    textLength: 0,
  }
  const ids = new Set<string>()
  const stack: Frame[] = []
  const captures: Capture[] = []
  let pendingSpace = false

  const capture = (finish: Capture['finish']) =>
    captures.push({ depth: stack.length - 1, parts: [], finish })

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        const parent = stack.at(-1)
        const frame: Frame = {
          name,
          landmark: landmarkOf(name, attribs.role) ?? parent?.landmark,
          visible: (parent?.visible ?? true) && !HIDDEN_TEXT_TAGS.has(name),
          svg: name === 'svg' || (parent?.svg ?? false),
        }
        stack.push(frame)
        if (attribs.id) ids.add(attribs.id)

        const level = HEADING_LEVELS.get(name)
        if (level) {
          const heading: RenderedHeading = { level, text: '' }
          if (attribs.id !== undefined) heading.id = attribs.id
          facts.headings.push(heading)
          capture((text) => (heading.text = collapseWhitespace(text)))
          return
        }

        switch (name) {
          case 'html':
            if (attribs.lang !== undefined) facts.lang ??= attribs.lang
            break
          case 'title':
            if (facts.title === undefined && !frame.svg) {
              capture((text) => (facts.title = collapseWhitespace(text)))
            }
            break
          case 'meta':
            readMeta(facts, attribs)
            break
          case 'link':
            readLink(facts, attribs)
            break
          case 'script':
            if (attribs.type?.trim().toLowerCase() === 'application/ld+json') {
              capture((text) => facts.structuredData.push(readStructuredData(text)))
            }
            break
          case 'a':
            if (attribs.href !== undefined) {
              facts.links.push({
                href: attribs.href,
                ...(attribs.rel !== undefined && { rel: attribs.rel }),
                ...elementContext(frame, attribs.class),
              })
            }
            break
          case 'img':
            facts.images.push({
              ...(attribs.src !== undefined && { src: attribs.src }),
              ...(attribs.alt !== undefined && { alt: attribs.alt }),
              ...elementContext(frame, attribs.class),
            })
            break
        }
      },
      ontext(text) {
        for (const open of captures) open.parts.push(text)
        if (!(stack.at(-1)?.visible ?? true)) return
        for (let index = 0; index < text.length; index++) {
          if (isWhitespace(text.charCodeAt(index))) {
            pendingSpace = facts.textLength > 0
          } else {
            facts.textLength += pendingSpace ? 2 : 1
            pendingSpace = false
          }
        }
      },
      onclosetag() {
        stack.pop()
        const open = captures.at(-1)
        if (open?.depth === stack.length) {
          captures.pop()
          open.finish(open.parts.join(''))
        }
      },
    },
    { decodeEntities: true },
  )
  parser.write(html)
  parser.end()

  facts.ids = [...ids]
  return facts
}

function landmarkOf(name: string, role: string | undefined): Landmark | undefined {
  if (LANDMARK_TAGS.has(name)) return name as Landmark
  const firstRole = role?.trim().toLowerCase().split(WHITESPACE)[0]
  return firstRole === undefined ? undefined : LANDMARK_ROLES.get(firstRole)
}

function elementContext(frame: Frame, classes: string | undefined): ElementContext {
  const classNames = classes?.split(WHITESPACE).filter(Boolean) ?? []
  return {
    selector: [frame.name, ...classNames].join('.'),
    ...(frame.landmark && { landmark: frame.landmark }),
  }
}

function readMeta(facts: RenderedPageFacts, attribs: Record<string, string>) {
  const content = attribs.content
  if (content === undefined) return
  const name = attribs.name?.trim().toLowerCase()
  if (name === 'description') {
    facts.description ??= collapseWhitespace(content)
  } else if (name === 'robots' || name === 'googlebot') {
    for (const directive of content.toLowerCase().split(/[\s,]+/)) {
      if (directive === 'noindex' || directive === 'none') facts.robots.noindex = true
      if (directive === 'nofollow' || directive === 'none') facts.robots.nofollow = true
    }
  } else if (attribs['http-equiv']?.trim().toLowerCase() === 'refresh') {
    const target = /^\s*[\d.]*\s*[;,]\s*(?:url\s*=\s*)?(.+)$/is.exec(content)?.[1]
    if (target !== undefined) facts.redirect ??= target.trim().replace(/^(['"])(.*)\1$/s, '$2')
  }
}

function readLink(facts: RenderedPageFacts, attribs: Record<string, string>) {
  const href = attribs.href
  if (href === undefined) return
  const rels = attribs.rel?.toLowerCase().split(WHITESPACE) ?? []
  if (rels.includes('canonical')) facts.canonical ??= href
  if (rels.includes('alternate') && attribs.hreflang !== undefined) {
    facts.alternates.push({ hreflang: attribs.hreflang, href })
  }
}

function readStructuredData(text: string): StructuredDataBlock {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    return { valid: false, error: (error as Error).message }
  }
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'JSON-LD must be an object or an array.' }
  }
  const types = new Set<string>()
  collectTypes(data, types)
  return { valid: true, types: [...types] }
}

/** Every @type in a JSON-LD value, a node's own type before the types nested in it. */
function collectTypes(value: unknown, types: Set<string>) {
  if (typeof value !== 'object' || value === null) return
  if (!Array.isArray(value)) {
    for (const type of [(value as Record<string, unknown>)['@type']].flat()) {
      if (typeof type === 'string') types.add(type)
    }
  }
  for (const child of Object.values(value)) collectTypes(child, types)
}

function collapseWhitespace(text: string): string {
  return text.split(WHITESPACE).filter(Boolean).join(' ')
}

function isWhitespace(code: number): boolean {
  return code === 0x20 || code === 0x0a || code === 0x09 || code === 0x0d || code === 0x0c
}
