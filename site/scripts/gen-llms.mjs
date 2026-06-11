// Generate llms.txt, llms-full.txt, and contentbit-guide.md into public/.
// Runs at build time, after gen-reference.mjs so the block reference is fresh.
import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry } from '@contentbit/core'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SITE_URL = 'https://contentbit.dev'
const ROOT = new URL('..', import.meta.url).pathname
const DOCS_DIR = path.join(ROOT, 'content/docs')
const BLOG_DIR = path.join(ROOT, 'content/blog')
const OUT_DIR = path.join(ROOT, 'public')

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return { meta: {}, body: raw }
  const meta = {}
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return { meta, body: raw.slice(match[0].length) }
}

/** MDX → plain markdown an LLM can read: Live blocks become fences, tabs unwrap. */
function mdxToMarkdown(body) {
  return body
    .replace(/<Live>\s*\{`([\s\S]*?)`\}\s*<\/Live>/g, (_, src) => `\`\`\`md\n${src}\n\`\`\``)
    .replace(/<Tabs[^>]*>/g, '')
    .replace(/<\/Tabs>/g, '')
    .replace(/<Tab[^>]*>/g, '')
    .replace(/<\/Tab>/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function collect(dir, ext) {
  const out = []
  const entries = await readdir(dir, { recursive: true })
  const sorted = entries
    .filter((e) => e.endsWith(ext))
    .sort((a, b) => {
      // Getting started (index.mdx) leads; the rest in path order.
      const ai = a.endsWith('index.mdx') ? 0 : 1
      const bi = b.endsWith('index.mdx') ? 0 : 1
      return ai - bi || a.localeCompare(b)
    })
  for (const entry of sorted) {
    const raw = await readFile(path.join(dir, entry), 'utf8')
    const { meta, body } = parseFrontmatter(raw)
    out.push({ file: entry, meta, body })
  }
  return out
}

function docUrl(file) {
  const slug = file.replace(/\.mdx$/, '').replace(/(^|\/)index$/, '')
  return `${SITE_URL}/docs${slug ? `/${slug}` : ''}`
}

const docs = await collect(DOCS_DIR, '.mdx')
const posts = await collect(BLOG_DIR, '.md')
const guide = createBlockRegistry()
  .use(genericBlocks())
  .toAuthoringGuide({ audience: 'llm', includeExamples: true })

// ── llms.txt: the index ──
const docLine = (d) => `- [${d.meta.title}](${docUrl(d.file)}): ${d.meta.description ?? ''}`
const llms = `# contentbit (Content Blocks)

> Structured Markdown components without framework lock-in. Authors — humans,
> CMSes, or LLMs — write plain Markdown with directive blocks (:::callout,
> :::comparison, ...). The library parses to a source-mapped AST, validates
> against per-block schemas with file:line:col diagnostics, and renders through
> React, static HTML, or a plain-Markdown fallback. npm scope: @contentbit.
> CLI: \`npx contentbit@latest init\`.

## Start here

- [Authoring rules](${SITE_URL}/contentbit-guide.md): the generated block-authoring instructions — paste these into a system prompt before writing Content Blocks documents
- [Full documentation as one file](${SITE_URL}/llms-full.txt)

## Docs

${docs.map(docLine).join('\n')}

## Blog

${posts.map((p) => `- [${p.meta.title}](${SITE_URL}/blog/${p.file.replace(/\.md$/, '')}): ${p.meta.description ?? ''}`).join('\n')}

## Packages

- @contentbit/core: parser, validator, registry, authoring-guide generation
- @contentbit/blocks: the generic block pack
- @contentbit/react: React renderer (headless defaults)
- @contentbit/html: static HTML renderer
- contentbit: CLI — init, validate, render, instructions
`

// ── llms-full.txt: everything inlined ──
const full = [
  llms,
  '---',
  '# Block authoring rules (generated from the registry)',
  '',
  guide,
  ...docs.flatMap((d) => [
    '---',
    `# ${d.meta.title}`,
    `URL: ${docUrl(d.file)}`,
    '',
    mdxToMarkdown(d.body),
  ]),
].join('\n')

await mkdir(OUT_DIR, { recursive: true })
await writeFile(path.join(OUT_DIR, 'llms.txt'), llms, 'utf8')
await writeFile(path.join(OUT_DIR, 'llms-full.txt'), full, 'utf8')
await writeFile(path.join(OUT_DIR, 'contentbit-guide.md'), guide, 'utf8')
console.log(
  `generated llms.txt (${docs.length} docs, ${posts.length} posts), llms-full.txt, contentbit-guide.md`,
)
