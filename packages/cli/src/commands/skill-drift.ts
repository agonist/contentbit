import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import type { AgentGuidanceSource } from '@contentbit/built-site'
import type { ContentProjectFinding } from '@contentbit/core'

import auditSkill from './agent-templates/contentbit-audit/SKILL.md?raw'
import authorSkill from './agent-templates/contentbit-author/SKILL.md?raw'

export interface SkillDriftFinding extends Omit<ContentProjectFinding, 'source'> {
  source: AgentGuidanceSource
}

const SHIPPED_SKILLS = [
  { name: 'contentbit-author', content: authorSkill },
  { name: 'contentbit-audit', content: auditSkill },
] as const

export async function skillDriftFindings(files: string[]): Promise<SkillDriftFinding[]> {
  const root = findInstalledSkillRoot(files)
  if (!root) return []

  const findings: SkillDriftFinding[] = []
  for (const skill of SHIPPED_SKILLS) {
    const shipped = skillVersion(skill.content)
    if (!shipped.value) continue

    const path = join(root, '.claude/skills', skill.name, 'SKILL.md')
    if (!existsSync(path)) continue

    const installedContent = await readFile(path, 'utf8')
    const installed = skillVersion(installedContent)
    if (installed.value === shipped.value) continue

    findings.push({
      severity: 'warning',
      source: 'agents',
      code: 'CB_SKILL_DRIFT',
      file: path,
      line: installed.line ?? 1,
      column: 1,
      message: `${skill.name} skill is stale (installed version ${installed.value ?? 'unknown'}, package ships ${shipped.value}).`,
      hint: 'Re-run contentbit agents from this project to refresh Claude Code skills.',
    })
  }
  return findings
}

function findInstalledSkillRoot(files: string[]): string | undefined {
  const home = homedir()
  for (const file of files) {
    let current = dirname(file)
    while (true) {
      if (current === home) break
      if (hasInstalledContentbitSkill(current)) return current
      if (existsSync(join(current, 'package.json'))) break
      const parent = dirname(current)
      if (parent === current) break
      current = parent
    }
  }
  return undefined
}

function hasInstalledContentbitSkill(root: string): boolean {
  return SHIPPED_SKILLS.some((skill) =>
    existsSync(join(root, '.claude/skills', skill.name, 'SKILL.md')),
  )
}

function skillVersion(content: string): { value?: string; line?: number } {
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^version:\s*['"]?([^'"\s]+)['"]?\s*$/)
    if (match) return { value: match[1], line: i + 1 }
  }
  return {}
}
