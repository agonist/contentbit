import { genericBlocks } from '@contentbit/blocks'
import {
  createBlockRegistry,
  formatDiagnostic,
  parseDocument,
  validateDocument,
} from '@contentbit/core'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

/*
 * Posts are plain .md files in content/blog — Content Blocks documents with a
 * small frontmatter header. They are parsed and validated by the library at
 * build time; a post with diagnostics fails the static export.
 */

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

const registry = createBlockRegistry().use(genericBlocks())

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  source: string
  blockCount: number
  words: number
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return { meta: {}, body: raw }
  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return { meta, body: raw.slice(match[0].length) }
}

export async function getPost(slug: string): Promise<BlogPost> {
  const raw = await readFile(path.join(BLOG_DIR, `${slug}.md`), 'utf8')
  const { meta, body } = parseFrontmatter(raw)

  const result = validateDocument(parseDocument(body), registry)
  if (!result.ok) {
    throw new Error(
      `Blog post "${slug}" is invalid:\n${result.diagnostics
        .map((d) => formatDiagnostic(d, `${slug}.md`))
        .join('\n')}`,
    )
  }

  return {
    slug,
    title: meta.title ?? slug,
    description: meta.description ?? '',
    date: meta.date ?? '',
    source: body,
    blockCount: result.document.children.filter((n) => n.type === 'block').length,
    words: body.split(/\s+/).length,
  }
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const files = await readdir(BLOG_DIR)
  const posts = await Promise.all(
    files.filter((f) => f.endsWith('.md')).map((f) => getPost(f.replace(/\.md$/, ''))),
  )
  return posts.sort((a, b) => b.date.localeCompare(a.date))
}
