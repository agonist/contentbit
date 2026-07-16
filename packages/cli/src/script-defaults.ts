import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'

import type { LinkOptionValues } from './link-options.js'

import { loadContentbitConfig } from './project-config.js'

export interface ContentCommandDefaults extends LinkOptionValues {
  cwd?: string
  globs: string[]
  registry?: string
  noGenericBlocks?: boolean
  seoConfig?: string
  noSeo?: boolean
  source?: string
}

type ContentCommand = 'validate' | 'doctor' | 'studio' | 'links' | 'stats' | 'brief' | 'snapshot'

const SCRIPT_CANDIDATES: Record<ContentCommand, string[]> = {
  validate: ['content:check', 'content:validate'],
  doctor: ['content:doctor', 'content:check'],
  studio: ['studio', 'content:studio', 'content:check'],
  links: ['content:links', 'content:check'],
  stats: ['content:stats', 'content:check'],
  brief: ['content:brief', 'content:check'],
  snapshot: ['content:snapshot', 'content:check'],
}

export async function discoverContentCommandDefaults(
  command: ContentCommand,
  explicitGlobs: string[],
  startDir = process.cwd(),
): Promise<ContentCommandDefaults> {
  const loadedConfig = await loadContentbitConfig(startDir)
  const configDefaults = loadedConfig
    ? {
        cwd: loadedConfig.cwd,
        registry: resolveConfigPath(loadedConfig.cwd, loadedConfig.config.registry),
        noGenericBlocks: loadedConfig.config.genericBlocks === false ? true : undefined,
        seoConfig:
          typeof loadedConfig.config.seo === 'string'
            ? resolveConfigPath(loadedConfig.cwd, loadedConfig.config.seo)
            : undefined,
        noSeo: loadedConfig.config.seo === false ? true : undefined,
        linkResolve: loadedConfig.config.links?.resolve,
        localeField: loadedConfig.config.links?.localeField,
        slugField: loadedConfig.config.links?.slugField,
        keyField: loadedConfig.config.links?.keyField,
        defaultLocale: loadedConfig.config.links?.defaultLocale,
        source: loadedConfig.path,
      }
    : {}

  if (explicitGlobs.length > 0) return { ...configDefaults, cwd: undefined, globs: explicitGlobs }
  if (loadedConfig) return { ...configDefaults, globs: loadedConfig.config.content }

  const found = await findPackageScript(command, startDir)
  if (!found) return { globs: [] }

  const parsed = parseContentbitScript(found.script)
  if (!parsed) return { globs: [] }

  return {
    ...flagsFromArgs(parsed.args),
    cwd: found.cwd,
    globs: positionalsFromArgs(parsed.args),
    source: `${found.packageJson}#scripts.${found.scriptName}`,
  }
}

function resolveConfigPath(cwd: string, path?: string): string | undefined {
  if (!path) return undefined
  return isAbsolute(path) ? path : resolve(cwd, path)
}

async function findPackageScript(
  command: ContentCommand,
  startDir: string,
): Promise<{ cwd: string; packageJson: string; scriptName: string; script: string } | undefined> {
  let current = resolve(startDir)
  while (true) {
    const packageJson = join(current, 'package.json')
    if (existsSync(packageJson)) {
      const scripts = await packageScripts(packageJson)
      for (const name of SCRIPT_CANDIDATES[command]) {
        const script = scripts[name]
        if (!script) continue
        const parsed = parseContentbitScript(script)
        if (!parsed) continue
        if (
          parsed.command === command ||
          (name === 'content:check' && parsed.command === 'validate')
        ) {
          return { cwd: current, packageJson, scriptName: name, script }
        }
      }
    }

    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

async function packageScripts(path: string): Promise<Record<string, string>> {
  try {
    const pkg = JSON.parse(await readFile(path, 'utf8')) as { scripts?: Record<string, unknown> }
    const out: Record<string, string> = {}
    for (const [name, value] of Object.entries(pkg.scripts ?? {})) {
      if (typeof value === 'string') out[name] = value
    }
    return out
  } catch {
    return {}
  }
}

function parseContentbitScript(script: string): { command: string; args: string[] } | undefined {
  const tokens = splitShellArgs(script)
  const bin = tokens.findIndex((token) => token === 'contentbit' || token.endsWith('/contentbit'))
  if (bin === -1) return undefined
  const command = tokens[bin + 1]
  if (!command) return undefined
  const args: string[] = []
  for (const token of tokens.slice(bin + 2)) {
    if (token === '&&' || token === ';') break
    args.push(token)
  }
  return { command, args }
}

function positionalsFromArgs(args: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--') {
      out.push(...args.slice(i + 1))
      break
    }
    if (arg.startsWith('-')) {
      if (flagTakesValue(arg) && !arg.includes('=')) i++
      continue
    }
    out.push(arg)
  }
  return out
}

function flagsFromArgs(args: string[]): Omit<ContentCommandDefaults, 'globs' | 'cwd' | 'source'> {
  const out: Omit<ContentCommandDefaults, 'globs' | 'cwd' | 'source'> = {}
  for (let i = 0; i < args.length; i++) {
    const raw = args[i]
    const [flag, inlineValue] = raw.split(/=(.*)/s, 2)
    const value = inlineValue ?? args[i + 1]
    if (flag === '--registry' && value) out.registry = value
    else if (flag === '--no-generic-blocks') out.noGenericBlocks = true
    else if (flag === '--seo-config' && value) out.seoConfig = value
    else if (flag === '--no-seo') out.noSeo = true
    else if (flag === '--link-resolve' && value) out.linkResolve = value
    else if (flag === '--locale-field' && value) out.localeField = value
    else if (flag === '--slug-field' && value) out.slugField = value
    else if (flag === '--key-field' && value) out.keyField = value
    else if (flag === '--default-locale' && value) out.defaultLocale = value
    if (flagTakesValue(flag) && inlineValue === undefined) i++
  }
  return out
}

function flagTakesValue(flag: string): boolean {
  return [
    '--registry',
    '--seo-config',
    '--link-resolve',
    '--locale-field',
    '--slug-field',
    '--key-field',
    '--default-locale',
  ].includes(flag)
}

function splitShellArgs(input: string): string[] {
  const args: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let escaped = false

  for (const ch of input) {
    if (escaped) {
      current += ch
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (/\s/.test(ch)) {
      if (current !== '') {
        args.push(current)
        current = ''
      }
      continue
    }
    current += ch
  }
  if (escaped) current += '\\'
  if (current !== '') args.push(current)
  return args
}
