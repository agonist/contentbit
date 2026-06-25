import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

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

/** Insert or replace the fenced contentbit block, leaving the rest untouched. */
function upsertBlock(existing: string): string {
  const start = existing.indexOf(START)
  const end = existing.indexOf(END)
  if (start !== -1 && end !== -1) {
    return existing.slice(0, start) + AGENTS_MD_BLOCK + existing.slice(end + END.length)
  }
  if (existing.trim() === '') return `${AGENTS_MD_BLOCK}\n`
  return `${existing.replace(/\n*$/, '\n\n')}${AGENTS_MD_BLOCK}\n`
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
  const claude = options.claude ?? existsSync(join(cwd, '.claude'))
  const agentsMd = options.agentsMd ?? true

  if (agentsMd) {
    const path = join(cwd, 'AGENTS.md')
    let existing = ''
    try {
      existing = await readFile(path, 'utf8')
    } catch {
      /* not there yet */
    }
    const created = existing === ''
    await writeFile(path, upsertBlock(existing), 'utf8')
    io.stdout(`${created ? 'created' : 'updated'}: AGENTS.md (contentbit block)`)
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
  }
}

export async function agentsCommand(args: string[], io: Io): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      claude: { type: 'boolean', default: false },
      'no-agents-md': { type: 'boolean', default: false },
      cwd: { type: 'string', default: process.cwd() },
    },
  })
  await installAgentIntegration(
    values.cwd,
    {
      claude: values.claude || undefined, // false means "detect", not "skip"
      agentsMd: !values['no-agents-md'],
    },
    io,
  )
  return 0
}
