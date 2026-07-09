import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'

import type { Io } from '../run.js'

import agentsMdTemplate from './agent-templates/AGENTS.md?raw'
import auditSkill from './agent-templates/contentbit-audit/SKILL.md?raw'
import authorSkill from './agent-templates/contentbit-author/SKILL.md?raw'

// These templates are static and project-independent by design: skills fetch
// live data (authoring guide, stats, diagnostics) by running the CLI, so the
// registry stays the single source of truth and nothing can drift. Bump the
// frontmatter version in each SKILL.md when a template changes; `contentbit
// agents` re-runs overwrite in place.
const AUTHOR_SKILL = authorSkill
const AUDIT_SKILL = auditSkill
const AGENTS_MD_BLOCK = agentsMdTemplate.trimEnd()

const START = '<!-- contentbit:start -->'
const END = '<!-- contentbit:end -->'
const AGENTS_GUIDE_URL = 'https://contentbit.dev/docs/guides/agents'

/** Insert or replace the fenced contentbit block, leaving the rest untouched. */
function upsertBlock(existing: string, block = AGENTS_MD_BLOCK): string {
  const start = existing.indexOf(START)
  const end = existing.indexOf(END)
  if (start !== -1 && end !== -1) {
    return existing.slice(0, start) + block + existing.slice(end + END.length)
  }
  if (existing.trim() === '') return `${block}\n`
  return `${existing.replace(/\n*$/, '\n\n')}${block}\n`
}

function rootPointerBlock(packagePath: string): string {
  return [
    START,
    '',
    '## contentbit content (generated — edits inside this block are overwritten)',
    '',
    `content lives in ${packagePath}; run contentbit commands from there.`,
    '',
    END,
  ].join('\n')
}

async function readTextIfExists(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return ''
  }
}

function isWorkspaceRoot(path: string): boolean {
  if (existsSync(join(path, 'pnpm-workspace.yaml'))) return true
  if (existsSync(join(path, 'lerna.json'))) return true
  if (existsSync(join(path, 'nx.json'))) return true
  try {
    const pkg = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')) as {
      workspaces?: unknown
    }
    return Array.isArray(pkg.workspaces) || typeof pkg.workspaces === 'object'
  } catch {
    return false
  }
}

function findMonorepoRoot(cwd: string): string | undefined {
  if (!existsSync(join(cwd, 'package.json'))) return undefined
  let current = dirname(cwd)
  while (current !== dirname(current)) {
    if (isWorkspaceRoot(current)) return current
    current = dirname(current)
  }
  return undefined
}

function displayRelative(from: string, to: string): string {
  const rel = relative(from, to) || '.'
  return rel.split(sep).join('/')
}

async function writeRootPointerIfNeeded(cwd: string, io: Io): Promise<void> {
  const root = findMonorepoRoot(cwd)
  if (!root) return

  const packagePath = displayRelative(root, cwd)
  const rootAgentsPath = join(root, 'AGENTS.md')
  const existing = await readTextIfExists(rootAgentsPath)
  const created = existing === ''
  await writeFile(rootAgentsPath, upsertBlock(existing, rootPointerBlock(packagePath)), 'utf8')
  io.stdout(
    `${created ? 'created' : 'updated'}: ${displayRelative(cwd, rootAgentsPath)} (contentbit root pointer)`,
  )
}

export interface AgentOptions {
  /** Install Claude Code skills; defaults to detecting a .claude/ directory. */
  claude?: boolean
  /** Manage the AGENTS.md block; defaults to true. */
  agentsMd?: boolean
}

/** Install or refresh the agent integration. Shared by `agents` and `init`. */
export async function installAgentIntegration(
  cwd: string,
  options: AgentOptions,
  io: Io,
): Promise<void> {
  const claudeDir = join(cwd, '.claude')
  const claudeDirExists = existsSync(claudeDir)
  const claude = options.claude ?? claudeDirExists
  const agentsMd = options.agentsMd ?? true

  if (agentsMd) {
    const path = join(cwd, 'AGENTS.md')
    const existing = await readTextIfExists(path)
    const created = existing === ''
    await writeFile(path, upsertBlock(existing), 'utf8')
    io.stdout(`${created ? 'created' : 'updated'}: AGENTS.md (contentbit block)`)
    await writeRootPointerIfNeeded(cwd, io)
  }

  if (claude) {
    const skills: Array<[string, string]> = [
      ['contentbit-author', AUTHOR_SKILL],
      ['contentbit-audit', AUDIT_SKILL],
    ]
    for (const [name, content] of skills) {
      const dir = join(cwd, '.claude/skills', name)
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'SKILL.md'), content, 'utf8')
      io.stdout(`installed: .claude/skills/${name}/SKILL.md`)
    }
    if (!claudeDirExists) {
      io.stdout('restart your Claude Code session so skills are picked up.')
    }
  } else {
    io.stdout('skipped: .claude/skills (no .claude directory — pass --claude to create it)')
  }
}

export interface AgentsCommandInput {
  claude?: boolean
  noAgentsMd?: boolean
  cwd?: string
}

export async function agentsCommand(input: AgentsCommandInput, io: Io): Promise<number> {
  await installAgentIntegration(
    resolve(input.cwd ?? process.cwd()),
    {
      claude: input.claude || undefined, // false means "detect", not "skip"
      agentsMd: !input.noAgentsMd,
    },
    io,
  )
  io.stdout(`Guide: ${AGENTS_GUIDE_URL}`)
  return 0
}
