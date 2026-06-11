import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'

type Target = 'react' | 'html' | 'markdown'

const TARGETS: Target[] = ['react', 'html', 'markdown']

type Md = 'react-markdown' | 'marked' | 'markdown-it' | 'none'

/** Markdown library choices per target; the first entry is the default. */
const MD_CHOICES: Record<Target, Md[]> = {
  react: ['react-markdown', 'none'],
  html: ['marked', 'markdown-it', 'none'],
  markdown: ['none'],
}

const REGISTRY_TEMPLATE = `// Custom block definitions for this project. The CLI and your app share
// this module — Node 22.18+ imports TypeScript directly:
//
//   contentbit validate "content/**/*.md" --registry ./blocks/registry.ts
//
// Definitions stay framework-free (the CLI and every render target use
// them); React components live next door in blocks/components.tsx.
// Docs: https://contentbit.dev/docs/guides/custom-blocks
import { defineBlock, markdownBody, type BlockDefinition } from '@contentbit/core'
import { z } from 'zod'

export const quote = defineBlock({
  name: 'quote',
  description: 'A pull quote with an author.',
  props: z.object({
    author: z.string().min(1),
    role: z.string().optional(),
  }),
  content: markdownBody({ minLength: 3 }),
  authoring: {
    useWhen: ['Quoting a person to support a point'],
    avoidWhen: ['Highlighting your own remark, use callout instead'],
    example: ':::quote{author="Ada Lovelace"}\\nThe Analytical Engine weaves algebraic patterns.\\n:::',
  },
})

export default [quote] satisfies BlockDefinition<unknown>[]
`

/** blocks/components.tsx — React components for custom blocks, next to their definitions. */
function blockComponentsTemplate(styled: boolean): string {
  const body = styled
    ? `  return (
    <figure className="my-6 border-s-2 ps-4">
      <blockquote className="text-lg italic">{ctx.renderMarkdown(data.markdown)}</blockquote>
      <figcaption className="text-muted-foreground mt-2 text-sm">
        — {String(node.props.author)}
        {node.props.role ? \`, \${String(node.props.role)}\` : null}
      </figcaption>
    </figure>
  )`
    : `  return (
    <figure style={{ margin: '1.5rem 0', borderLeft: '2px solid #d4d4d4', paddingLeft: '1rem' }}>
      <blockquote style={{ fontStyle: 'italic' }}>{ctx.renderMarkdown(data.markdown)}</blockquote>
      <figcaption style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
        — {String(node.props.author)}
        {node.props.role ? \`, \${String(node.props.role)}\` : null}
      </figcaption>
    </figure>
  )`
  return `import type { BlockComponent, BlockComponentProps } from '@contentbit/react'

// One React component per custom block, keyed by block name. Definitions
// live in ./registry.ts — add a block there, add its component here, and
// the rest of the app never changes.
function QuoteBlock({ node, ctx }: BlockComponentProps) {
  const data = node.data as { markdown: string }
${body}
}

export const blockComponents: Record<string, BlockComponent> = {
  quote: QuoteBlock,
}
`
}

const EXAMPLE_CONTENT = `# Hello, Content Blocks

Regular Markdown works everywhere. Blocks add validated structure:

:::callout{type="tip" title="Try breaking this file"}
Run the validate script and you will get file:line:col diagnostics.
:::

:::steps
1. Edit this file and add or break a block.
2. Run \`contentbit validate "content/**/*.md"\`.
3. Render it with the target you picked at init.
:::

This one is a **custom block**, defined in \`blocks/registry.ts\` and rendered
by the \`QuoteBlock\` component, in about twenty lines:

:::quote{author="Ada Lovelace" role="Notes on the Analytical Engine, 1843"}
The Analytical Engine weaves algebraic patterns just as the Jacquard loom
weaves flowers and leaves.
:::
`

/** The wrapper component: styled pack or headless, with or without a Markdown lib. */
function reactComponent(styled: boolean, mdWired: boolean, blocksImport: string): string {
  const mdImport = mdWired ? "import ReactMarkdown from 'react-markdown'\n" : ''
  const mdProp = mdWired
    ? '\n      renderMarkdown={(md) => <ReactMarkdown>{md}</ReactMarkdown>}'
    : `\n      // TODO: plug your Markdown library in here, e.g. react-markdown.
      // One function renders all prose: https://contentbit.dev/docs/guides/markdown
      // renderMarkdown={(md) => <Markdown source={md} />}`
  const rendererImport = styled
    ? `\n// The styled pack installed by shadcn. Yours to edit.
import { ContentRenderer } from '@/components/content-blocks/content-renderer'`
    : ''
  const renderer = styled ? 'ContentRenderer' : 'ContentBlocks'
  const reactImport = styled ? '' : "import { ContentBlocks } from '@contentbit/react'\n"
  return `'use client'

import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
${reactImport}${mdImport}${rendererImport}
// Everything block-related lives in the blocks/ folder: definitions in
// registry.ts (shared with the validate CLI), components in components.tsx.
import customBlocks from '${blocksImport}/registry'
import { blockComponents } from '${blocksImport}/components'

const registry = createBlockRegistry().use(genericBlocks()).use(customBlocks)

export function Content({ source }: { source: string }) {
  const result = validateDocument(parseDocument(source), registry)
  return (
    <${renderer}
      document={result.document}
      components={blockComponents}${mdProp}
    />
  )
}
`
}

function htmlRenderScript(md: 'marked' | 'markdown-it' | 'none'): string {
  const wiring =
    md === 'marked'
      ? `import { marked } from 'marked'

const renderMarkdown = (md) => marked.parse(md, { async: false })`
      : md === 'markdown-it'
        ? `import MarkdownIt from 'markdown-it'

const mdIt = new MarkdownIt() // html: false by default — raw HTML stays escaped
const renderMarkdown = (md) => mdIt.render(md)`
        : `// TODO: plug a Markdown library in here (marked, markdown-it, remark).
const renderMarkdown = undefined`
  return `// Render content/example.md to example.html. Run: node scripts/render-example.mjs
import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { renderToHtml } from '@contentbit/html'
import { readFile, writeFile } from 'node:fs/promises'
${wiring}

const source = await readFile('content/example.md', 'utf8')
const registry = createBlockRegistry().use(genericBlocks())
const result = validateDocument(parseDocument(source), registry)
const html = renderToHtml(result.document, { renderMarkdown })
await writeFile('example.html', html, 'utf8')
console.log('wrote example.html')
`
}

type Framework = 'tanstack' | 'next' | null

interface FrameworkLayout {
  framework: Framework
  componentPath: string
  pagePath: string | null
}

/** Where the component and example page belong for the detected framework. */
function detectFramework(cwd: string, deps: Record<string, string>): FrameworkLayout {
  if (
    (deps['@tanstack/react-start'] || deps['@tanstack/react-router']) &&
    existsSync(join(cwd, 'src/routes'))
  ) {
    return {
      framework: 'tanstack',
      componentPath: 'src/components/content-blocks.tsx',
      pagePath: 'src/routes/example.tsx',
    }
  }
  if (deps.next) {
    const appDir = existsSync(join(cwd, 'src/app')) ? 'src/app' : 'app'
    if (existsSync(join(cwd, appDir))) {
      return {
        framework: 'next',
        componentPath: 'components/content-blocks.tsx',
        pagePath: `${appDir}/example/page.tsx`,
      }
    }
  }
  return { framework: null, componentPath: 'components/content-blocks.tsx', pagePath: null }
}

const TANSTACK_PAGE = `import { createFileRoute } from '@tanstack/react-router'

import { Content } from '../components/content-blocks'
// Vite's ?raw import inlines the Markdown as a string at build time.
import source from '../../content/example.md?raw'

export const Route = createFileRoute('/example')({ component: ExamplePage })

function ExamplePage() {
  return (
    <main style={{ maxWidth: '42rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <Content source={source} />
    </main>
  )
}
`

const NEXT_PAGE = `import { readFile } from 'node:fs/promises'

// If your project has no "@/" path alias, switch to a relative import.
import { Content } from '@/components/content-blocks'

export default async function ExamplePage() {
  const source = await readFile('content/example.md', 'utf8')
  return (
    <main style={{ maxWidth: '42rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <Content source={source} />
    </main>
  )
}
`

function detectPackageManager(cwd: string): string {
  // The project's lockfile outranks however the CLI itself was launched.
  const locks: Array<[string, string]> = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm'],
  ]
  for (const [file, pm] of locks) {
    if (existsSync(join(cwd, file))) return pm
  }
  const agent = process.env.npm_config_user_agent ?? ''
  for (const pm of ['pnpm', 'yarn', 'bun']) {
    if (agent.startsWith(pm)) return pm
  }
  return 'npm'
}

function installArgs(pm: string, dev: boolean, pkgs: string[]): string[] {
  const add = pm === 'npm' ? 'install' : 'add'
  return dev ? [add, '-D', ...pkgs] : [add, ...pkgs]
}

function dlxCommand(pm: string): [string, string[]] {
  if (pm === 'pnpm') return ['pnpm', ['dlx']]
  if (pm === 'yarn') return ['yarn', ['dlx']]
  if (pm === 'bun') return ['bunx', []]
  return ['npx', ['--yes']]
}

function runInstall(pm: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(pm, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('close', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

/** Write a file unless it already exists; returns what happened for the summary. */
async function scaffold(path: string, content: string): Promise<'created' | 'skipped'> {
  try {
    await readFile(path, 'utf8')
    return 'skipped'
  } catch {
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, content, 'utf8')
    return 'created'
  }
}

export async function initCommand(args: string[], io: Io): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      target: { type: 'string', short: 't' },
      md: { type: 'string' },
      yes: { type: 'boolean', short: 'y', default: false },
      cwd: { type: 'string', default: process.cwd() },
      'no-install': { type: 'boolean', default: false },
      'no-page': { type: 'boolean', default: false },
      'no-styled': { type: 'boolean', default: false },
    },
  })
  const cwd = values.cwd

  // A project to init into is required.
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  const pkgPath = join(cwd, 'package.json')
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  } catch {
    io.stderr('No package.json found. Run this inside a project (npm init first).')
    return 1
  }

  // Resolve the render target: flag > prompt (interactive) > detection.
  const hasReact = Boolean(pkg.dependencies?.react ?? pkg.devDependencies?.react)
  const detected: Target = hasReact ? 'react' : 'html'
  let target: Target
  if (values.target) {
    if (!TARGETS.includes(values.target as Target)) {
      io.stderr(`Unknown target "${values.target}". Use one of: ${TARGETS.join(', ')}`)
      return 2
    }
    target = values.target as Target
  } else if (!values.yes && process.stdin.isTTY && process.stdout.isTTY) {
    const { isCancel, select } = await import('@clack/prompts')
    const answer = await select({
      message: 'Render target?',
      initialValue: detected,
      options: [
        { value: 'react', label: 'React', hint: 'ContentBlocks component' },
        { value: 'html', label: 'Static HTML', hint: 'renderToHtml, no framework' },
        { value: 'markdown', label: 'Plain Markdown', hint: 'fallback rendering only' },
      ],
    })
    if (isCancel(answer)) return 1
    target = answer as Target
  } else {
    target = detected
  }

  // Resolve the Markdown library: flag > prompt (interactive) > target default.
  // The default gives working prose rendering out of the box; 'none' opts out.
  const choices = MD_CHOICES[target]
  let md: Md
  if (values.md) {
    if (!choices.includes(values.md as Md)) {
      io.stderr(`Unknown markdown library "${values.md}". Use one of: ${choices.join(', ')}`)
      return 2
    }
    md = values.md as Md
  } else if (choices.length > 1 && !values.yes && process.stdin.isTTY && process.stdout.isTTY) {
    const { isCancel, select } = await import('@clack/prompts')
    const answer = await select({
      message: 'Markdown library for prose rendering?',
      initialValue: choices[0],
      options: choices.map((c) => ({
        value: c,
        label: c,
        hint: c === 'none' ? 'wire one yourself later' : 'installed and wired for you',
      })),
    })
    if (isCancel(answer)) return 1
    md = answer as Md
  } else {
    md = choices[0]
  }

  // Install runtime packages plus the CLI as a dev dependency.
  const runtime = ['@contentbit/core', '@contentbit/blocks', 'zod']
  if (target === 'react') runtime.push('@contentbit/react')
  if (target === 'html') runtime.push('@contentbit/html')
  if (md !== 'none') runtime.push(md)
  if (values['no-install']) {
    io.stdout(`skipped install: ${runtime.join(' ')} + contentbit (dev)`)
  } else {
    const pm = detectPackageManager(cwd)
    io.stdout(`installing with ${pm}: ${runtime.join(' ')}`)
    if ((await runInstall(pm, installArgs(pm, false, runtime), cwd)) !== 0) {
      io.stderr('install failed')
      return 1
    }
    if ((await runInstall(pm, installArgs(pm, true, ['contentbit']), cwd)) !== 0) {
      io.stderr('install failed')
      return 1
    }
  }

  // Scaffold project files; never overwrite.
  const files: Array<[string, string]> = [
    ['blocks/registry.ts', REGISTRY_TEMPLATE],
    ['content/example.md', EXAMPLE_CONTENT],
  ]
  const layout = detectFramework(cwd, { ...pkg.dependencies, ...pkg.devDependencies })

  // shadcn project? Pull the styled component pack from the contentbit registry.
  let styled = false
  const componentsJsonPath = join(cwd, 'components.json')
  if (target === 'react' && !values['no-styled'] && existsSync(componentsJsonPath)) {
    const componentsJson = JSON.parse(await readFile(componentsJsonPath, 'utf8')) as {
      registries?: Record<string, string>
    }
    componentsJson.registries ??= {}
    if (!componentsJson.registries['@contentbit']) {
      componentsJson.registries['@contentbit'] = 'https://contentbit.dev/r/{name}.json'
      await writeFile(componentsJsonPath, `${JSON.stringify(componentsJson, null, 2)}\n`, 'utf8')
      io.stdout('added @contentbit registry to components.json')
    }
    if (values['no-install']) {
      io.stdout('skipped: shadcn add @contentbit/generic-pack')
      styled = true
    } else {
      const [bin, prefix] = dlxCommand(detectPackageManager(cwd))
      io.stdout('installing the styled pack: shadcn add @contentbit/generic-pack')
      const code = await runInstall(
        bin,
        [...prefix, 'shadcn@latest', 'add', '@contentbit/generic-pack', '--yes'],
        cwd,
      )
      if (code === 0) styled = true
      else io.stderr('styled pack install failed; falling back to headless defaults')
    }
  }

  if (target === 'react') {
    const depth = layout.componentPath.split('/').length - 1
    const blocksImport = `${'../'.repeat(depth)}blocks`
    files.push(['blocks/components.tsx', blockComponentsTemplate(styled)])
    files.push([
      layout.componentPath,
      reactComponent(styled, md === 'react-markdown', blocksImport),
    ])
    // A visible page in the framework's own routing convention.
    if (!values['no-page'] && layout.pagePath) {
      files.push([layout.pagePath, layout.framework === 'tanstack' ? TANSTACK_PAGE : NEXT_PAGE])
    }
  }
  if (target === 'html') {
    files.push([
      'scripts/render-example.mjs',
      htmlRenderScript(md as 'marked' | 'markdown-it' | 'none'),
    ])
  }
  for (const [rel, content] of files) {
    const result = await scaffold(join(cwd, rel), content)
    io.stdout(`${result}: ${rel}`)
  }

  // Wire the validate script.
  const fresh = JSON.parse(await readFile(pkgPath, 'utf8')) as {
    scripts?: Record<string, string>
  }
  fresh.scripts ??= {}
  if (!fresh.scripts['content:check']) {
    fresh.scripts['content:check'] =
      'contentbit validate "content/**/*.md" --registry ./blocks/registry.ts'
    await writeFile(pkgPath, `${JSON.stringify(fresh, null, 2)}\n`, 'utf8')
    io.stdout('added script: content:check')
  }

  // Generate the LLM authoring guide from the registry, ready to paste into a prompt.
  let registry
  try {
    // Include the scaffolded custom blocks so the guide covers them too.
    registry = await loadRegistry(join(cwd, 'blocks/registry.ts'))
  } catch {
    registry = await loadRegistry() // packages not installed yet (--no-install)
  }
  const guide = registry.toAuthoringGuide({ audience: 'llm', includeExamples: true })
  await writeFile(join(cwd, 'contentbit-guide.md'), guide, 'utf8')
  io.stdout('created: contentbit-guide.md (LLM authoring instructions)')

  io.stdout('')
  io.stdout('Done. Next steps:')
  io.stdout(`  1. Validate the starter content: ${detectPackageManager(cwd)} run content:check`)
  if (target === 'react') {
    if (!values['no-page'] && layout.pagePath) {
      io.stdout('  2. Start the dev server and open /example to see the article rendered.')
    } else {
      io.stdout('  2. Render it: import { Content } from "./components/content-blocks"')
      io.stdout('     <Content source={...content/example.md as a string} />')
    }
    io.stdout('  3. Styled components: pnpm dlx shadcn@latest add @contentbit/generic-pack')
  } else if (target === 'html') {
    io.stdout('  2. Render it: node scripts/render-example.mjs && open example.html')
  } else {
    io.stdout('  2. Render it: contentbit render content/example.md --target markdown')
  }
  io.stdout('  Docs: https://contentbit.dev/docs')
  return 0
}
