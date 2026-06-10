import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import type { Io } from '../run.js'

import { loadRegistry } from '../load-registry.js'

type Target = 'react' | 'html' | 'markdown'

const TARGETS: Target[] = ['react', 'html', 'markdown']

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

const REACT_COMPONENT = `import { genericBlocks } from '@contentbit/blocks'
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

function detectPackageManager(): string {
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

  // Install runtime packages plus the CLI as a dev dependency.
  const runtime = ['@contentbit/core', '@contentbit/blocks']
  if (target === 'react') runtime.push('@contentbit/react')
  if (target === 'html') runtime.push('@contentbit/html')
  if (values['no-install']) {
    io.stdout(`skipped install: ${runtime.join(' ')} + contentbit (dev)`)
  } else {
    const pm = detectPackageManager()
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
  if (target === 'react') files.push(['components/content-blocks.tsx', REACT_COMPONENT])
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
  io.stdout(`  1. Validate the starter content: ${detectPackageManager()} run content:check`)
  if (target === 'react') {
    io.stdout('  2. Render it: import { Content } from "./components/content-blocks"')
    io.stdout('  3. Styled components: pnpm dlx shadcn@latest add @contentbit/generic-pack')
  } else if (target === 'html') {
    io.stdout('  2. Render it: contentbit render content/example.md --target html')
  } else {
    io.stdout('  2. Render it: contentbit render content/example.md --target markdown')
  }
  io.stdout('  Docs: https://contentbit.dev/docs')
  return 0
}
