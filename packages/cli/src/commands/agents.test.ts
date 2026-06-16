import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

async function project(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'cb-agents-'))
}

test('creates AGENTS.md with a fenced contentbit block', async () => {
  const dir = await project()
  const io = fakeIo()
  expect(await run(['agents', '--cwd', dir], io)).toBe(0)
  const agentsMd = await readFile(join(dir, 'AGENTS.md'), 'utf8')
  expect(agentsMd).toContain('<!-- contentbit:start -->')
  expect(agentsMd).toContain('<!-- contentbit:end -->')
  // The block teaches the live-CLI loop, not baked-in schemas.
  expect(agentsMd).toContain('contentbit instructions --audience llm')
  expect(agentsMd).toContain('contentbit validate')
  expect(agentsMd).toContain('contentbit stats')
  expect(agentsMd).toContain('contentbit links')
  expect(io.out.join('\n')).toContain('AGENTS.md')
})

test('preserves user content around the block and is idempotent', async () => {
  const dir = await project()
  await writeFile(join(dir, 'AGENTS.md'), '# My project\n\nUser notes.\n', 'utf8')
  await run(['agents', '--cwd', dir], fakeIo())
  await run(['agents', '--cwd', dir], fakeIo())
  const agentsMd = await readFile(join(dir, 'AGENTS.md'), 'utf8')
  expect(agentsMd).toContain('# My project')
  expect(agentsMd).toContain('User notes.')
  expect(agentsMd.match(/<!-- contentbit:start -->/g)).toHaveLength(1)
})

test('replaces a stale block between markers', async () => {
  const dir = await project()
  await writeFile(
    join(dir, 'AGENTS.md'),
    'before\n\n<!-- contentbit:start -->\nold stale content\n<!-- contentbit:end -->\n\nafter\n',
    'utf8',
  )
  await run(['agents', '--cwd', dir], fakeIo())
  const agentsMd = await readFile(join(dir, 'AGENTS.md'), 'utf8')
  expect(agentsMd).not.toContain('old stale content')
  expect(agentsMd).toContain('before')
  expect(agentsMd).toContain('after')
  expect(agentsMd).toContain('contentbit validate')
})

test('installs Claude Code skills when .claude/ exists', async () => {
  const dir = await project()
  await mkdir(join(dir, '.claude'))
  const io = fakeIo()
  expect(await run(['agents', '--cwd', dir], io)).toBe(0)
  const author = await readFile(join(dir, '.claude/skills/contentbit-author/SKILL.md'), 'utf8')
  expect(author).toContain('name: contentbit-author')
  expect(author).toContain('contentbit instructions --audience llm')
  expect(author).toContain('contentbit validate')
  expect(author).toContain('contentbit links')
  const audit = await readFile(join(dir, '.claude/skills/contentbit-audit/SKILL.md'), 'utf8')
  expect(audit).toContain('name: contentbit-audit')
  expect(audit).toContain('contentbit stats')
  expect(audit).toContain('contentbit links')
  expect(io.out.join('\n')).toContain('contentbit-author')
})

test('skips Claude Code skills when .claude/ is absent', async () => {
  const dir = await project()
  await run(['agents', '--cwd', dir], fakeIo())
  await expect(
    readFile(join(dir, '.claude/skills/contentbit-author/SKILL.md'), 'utf8'),
  ).rejects.toThrow()
})

test('--claude forces skill install without a .claude/ directory', async () => {
  const dir = await project()
  await run(['agents', '--claude', '--cwd', dir], fakeIo())
  await expect(
    readFile(join(dir, '.claude/skills/contentbit-author/SKILL.md'), 'utf8'),
  ).resolves.toContain('contentbit-author')
})

test('--no-agents-md leaves AGENTS.md alone', async () => {
  const dir = await project()
  await run(['agents', '--claude', '--no-agents-md', '--cwd', dir], fakeIo())
  await expect(readFile(join(dir, 'AGENTS.md'), 'utf8')).rejects.toThrow()
})

test('re-running refreshes skill files in place', async () => {
  const dir = await project()
  await mkdir(join(dir, '.claude'))
  await run(['agents', '--cwd', dir], fakeIo())
  const skillPath = join(dir, '.claude/skills/contentbit-author/SKILL.md')
  await writeFile(skillPath, 'stale\n', 'utf8')
  await run(['agents', '--cwd', dir], fakeIo())
  await expect(readFile(skillPath, 'utf8')).resolves.toContain('contentbit-author')
})
