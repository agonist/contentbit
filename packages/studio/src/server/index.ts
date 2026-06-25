import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer, searchForWorkspaceRoot, type Plugin, type ViteDevServer } from 'vite'
import type { BlockComponent } from '@contentbit/react'

import { handleStudioApiRequest } from './api.js'
import type { StartStudioOptions, StudioOptions } from './types.js'

export type {
  StartStudioOptions,
  StudioDocument,
  StudioFileSummary,
  StudioFinding,
  StudioGraph,
  StudioProject,
} from './types.js'
export { scanDocument, scanGraph, scanProject } from './scan.js'

export interface StudioServer {
  url: string
  close(): Promise<void>
  closed: Promise<void>
  vite: ViteDevServer
}

export async function startStudio(options: StartStudioOptions): Promise<StudioServer> {
  const root = findPackageRoot()
  const host = options.host ?? '127.0.0.1'
  const port = options.port ?? 4377
  const cwd = options.cwd ?? process.cwd()
  // Vite serves only files under `fs.allow`. We need:
  // - `root`: the Studio package itself (its built UI and source).
  // - `searchForWorkspaceRoot(root)`: the workspace that hoists Studio's deps,
  //   so packaged fonts and other Vite-served dependency assets resolve when
  //   Studio is installed into a monorepo.
  // - `cwd`: the consuming project, so Studio can read its content/blocks.
  // We deliberately do NOT add `searchForWorkspaceRoot(cwd)`: in a project with
  // no workspace marker, Vite walks up past the git root to the nearest ancestor
  // `package.json`, which can expose an unexpectedly broad directory over HTTP
  // (notably with `--host`).
  const fsAllow = [...new Set([root, searchForWorkspaceRoot(root), cwd])]
  const apiOptions: StudioOptions = {
    globs: options.globs,
    cwd,
    registryPath: options.registryPath,
    includeGenericBlocks: options.includeGenericBlocks,
    linkOptions: options.linkOptions,
    minSectionWords: options.minSectionWords,
  }

  const vite = await createServer({
    root,
    configFile: join(root, 'vite.config.ts'),
    plugins: [studioApiPlugin(apiOptions)],
    server: {
      host,
      port,
      strictPort: options.port !== undefined && options.port !== 0,
      open: false,
      fs: {
        allow: fsAllow,
      },
    },
  })
  apiOptions.previewComponents = () =>
    loadProjectComponents(vite, { cwd, registryPath: options.registryPath })

  await vite.listen()
  const address = vite.httpServer?.address()
  const resolvedPort = typeof address === 'object' && address ? address.port : port
  const url = `http://${host}:${resolvedPort}/`
  if (options.open !== false) openBrowser(url)

  return {
    url,
    vite,
    close: () => vite.close(),
    closed: new Promise((resolve) => {
      vite.httpServer?.once('close', () => resolve())
    }),
  }
}

async function loadProjectComponents(
  vite: ViteDevServer,
  options: { cwd: string; registryPath?: string },
): Promise<Record<string, BlockComponent> | undefined> {
  const merged: Record<string, BlockComponent> = {}
  for (const candidate of componentCandidates(options)) {
    if (!existsSync(candidate.path)) continue
    let mod: {
      styledComponents?: Record<string, BlockComponent>
      blockComponents?: Record<string, BlockComponent>
      components?: Record<string, BlockComponent>
      default?: Record<string, BlockComponent>
    }
    try {
      mod = (await vite.ssrLoadModule(candidate.path)) as typeof mod
    } catch {
      if (!candidate.bestEffort)
        throw new Error(`Failed to load block components: ${candidate.path}`)
      continue
    }
    const maps = [mod.styledComponents, mod.blockComponents, mod.components, mod.default]
    for (const components of maps) {
      if (components && typeof components === 'object') Object.assign(merged, components)
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined
}

interface ComponentCandidate {
  path: string
  bestEffort: boolean
}

function componentCandidates(options: {
  cwd: string
  registryPath?: string
}): ComponentCandidate[] {
  const dirs = new Set<string>()
  if (options.registryPath) {
    const registryPath = isAbsolute(options.registryPath)
      ? options.registryPath
      : resolve(options.cwd, options.registryPath)
    dirs.add(dirname(registryPath))
  }
  dirs.add(join(options.cwd, 'blocks'))

  const rendererCandidates = [
    join(options.cwd, 'components/content-blocks/content-renderer.tsx'),
    join(options.cwd, 'src/components/content-blocks/content-renderer.tsx'),
  ].map((path) => ({ path, bestEffort: true }))
  const blockComponentCandidates = [...dirs].flatMap((dir) =>
    [
      join(dir, 'components.tsx'),
      join(dir, 'components.ts'),
      join(dir, 'preview.tsx'),
      join(dir, 'preview.ts'),
      join(dir, 'renderers.tsx'),
      join(dir, 'renderers.ts'),
    ].map((path) => ({ path, bestEffort: false })),
  )
  return [...rendererCandidates, ...blockComponentCandidates]
}

function studioApiPlugin(options: StudioOptions): Plugin {
  return {
    name: 'contentbit-studio-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handleStudioApiRequest(options, req, res).then((handled) => {
          if (!handled) next()
        })
      })
    },
  }
}

function findPackageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (;;) {
    if (existsSync(join(dir, 'package.json'))) return dir
    const next = dirname(dir)
    if (next === dir) throw new Error('Could not locate @contentbit/studio package root.')
    dir = next
  }
}

function openBrowser(url: string): void {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.unref()
}
