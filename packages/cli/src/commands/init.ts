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

const REGISTRY_TEMPLATE = `// Custom blocks for this project. The CLI and your app share this module:
//
//   contentbit validate "content/**/*.md" --registry ./blocks/registry.mjs
//
// Define blocks with @contentbit/core and default-export them as an array.
// Docs: https://contentbit.dev/docs/guides/custom-blocks
//
// import { defineBlock, pipeRows } from '@contentbit/core'
// import { z } from 'zod'
//
// const pricingTable = defineBlock({
//   name: 'pricing-table',
//   description: 'Compares product plans.',
//   props: z.object({ currency: z.enum(['usd', 'eur']).default('usd') }),
//   content: pipeRows({ columns: ['plan', 'price'], minRows: 2 }),
//   authoring: {
//     useWhen: ['Comparing pricing plans'],
//     example: ':::pricing-table\\n- Starter | $0\\n- Pro | $12/mo\\n:::',
//   },
// })

export default []
`

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
`

const REACT_COMPONENT_WIRED = `import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { ContentBlocks } from '@contentbit/react'
import ReactMarkdown from 'react-markdown'

// Generic pack. Add your own blocks from blocks/registry.mjs as the project grows.
const registry = createBlockRegistry().use(genericBlocks())

export function Content({ source }: { source: string }) {
  const result = validateDocument(parseDocument(source), registry)
  return (
    <ContentBlocks
      document={result.document}
      // One function renders all prose: https://contentbit.dev/docs/guides/markdown
      renderMarkdown={(md) => <ReactMarkdown>{md}</ReactMarkdown>}
    />
  )
}
`

const REACT_COMPONENT_PLAIN = `import { genericBlocks } from '@contentbit/blocks'
import { createBlockRegistry, parseDocument, validateDocument } from '@contentbit/core'
import { ContentBlocks } from '@contentbit/react'

const registry = createBlockRegistry().use(genericBlocks())

export function Content({ source }: { source: string }) {
  const result = validateDocument(parseDocument(source), registry)
  return (
    <ContentBlocks
      document={result.document}
      // TODO: plug your Markdown library in here, e.g. react-markdown.
      // One function renders all prose: https://contentbit.dev/docs/guides/markdown
      // renderMarkdown={(md) => <Markdown source={md} />}
    />
  )
}
`

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
  const runtime = ['@contentbit/core', '@contentbit/blocks']
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
    ['blocks/registry.mjs', REGISTRY_TEMPLATE],
    ['content/example.md', EXAMPLE_CONTENT],
  ]
  if (target === 'react') {
    files.push([
      'components/content-blocks.tsx',
      md === 'react-markdown' ? REACT_COMPONENT_WIRED : REACT_COMPONENT_PLAIN,
    ])
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
      'contentbit validate "content/**/*.md" --registry ./blocks/registry.mjs'
    await writeFile(pkgPath, `${JSON.stringify(fresh, null, 2)}\n`, 'utf8')
    io.stdout('added script: content:check')
  }

  // Generate the LLM authoring guide from the registry, ready to paste into a prompt.
  const registry = await loadRegistry()
  const guide = registry.toAuthoringGuide({ audience: 'llm', includeExamples: true })
  await writeFile(join(cwd, 'contentbit-guide.md'), guide, 'utf8')
  io.stdout('created: contentbit-guide.md (LLM authoring instructions)')

  io.stdout('')
  io.stdout('Done. Next steps:')
  io.stdout(`  1. Validate the starter content: ${detectPackageManager(cwd)} run content:check`)
  if (target === 'react') {
    io.stdout('  2. Render it: import { Content } from "./components/content-blocks"')
    io.stdout('     <Content source={...content/example.md as a string} />')
    io.stdout('  3. Styled components: pnpm dlx shadcn@latest add @contentbit/generic-pack')
  } else if (target === 'html') {
    io.stdout('  2. Render it: node scripts/render-example.mjs && open example.html')
  } else {
    io.stdout('  2. Render it: contentbit render content/example.md --target markdown')
  }
  io.stdout('  Docs: https://contentbit.dev/docs')
  return 0
}
