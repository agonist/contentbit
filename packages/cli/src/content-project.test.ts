import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { loadContentProject, resolveContentFiles } from './content-project'
import { CliError } from './run'

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-cp-'))
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf8')
  }
  return dir
}

test('resolveContentFiles throws CliError exit 2 with no positionals', async () => {
  await expect(resolveContentFiles([], 'validate')).rejects.toMatchObject({
    exitCode: 2,
    message: 'validate: provide at least one file or glob.',
  })
  await expect(resolveContentFiles([], 'validate')).rejects.toBeInstanceOf(CliError)
})

test('resolveContentFiles throws CliError exit 2 when nothing matches', async () => {
  const dir = await fixture({})
  await expect(resolveContentFiles([join(dir, '*.md')], 'doctor')).rejects.toMatchObject({
    exitCode: 2,
    message: `doctor: no files matched ${join(dir, '*.md')}`,
  })
})

test('resolveContentFiles returns sorted absolute paths', async () => {
  const dir = await fixture({ 'b.md': 'b\n', 'a.md': 'a\n', 'c.md': 'c\n' })
  const files = await resolveContentFiles([join(dir, '*.md')], 'validate')
  expect(files).toEqual([join(dir, 'a.md'), join(dir, 'b.md'), join(dir, 'c.md')])
})

test('loadContentProject returns a scan over the read sources', async () => {
  const dir = await fixture({
    'good.md': ':::callout{type="tip"}\nWeigh your flour.\n:::\n',
  })
  const project = await loadContentProject({
    cmd: 'validate',
    positionals: [join(dir, '*.md')],
    includeGenericBlocks: true,
    linkOptions: {},
  })
  expect(project.files).toEqual([join(dir, 'good.md')])
  expect(project.sources).toHaveLength(1)
  expect(project.sources[0]?.source).toContain('Weigh your flour.')
  expect(project.scan.files).toHaveLength(1)
  expect(project.scan.summary.errors).toBe(0)
  // generic callout is known, so no "unknown block" finding
  expect(project.scan.findings.some((f) => f.code === 'CB_UNKNOWN_BLOCK')).toBe(false)
})

test('loadContentProject honors includeGenericBlocks: false', async () => {
  const dir = await fixture({ 'c.md': ':::callout{type="tip"}\nWeigh your flour.\n:::\n' })
  const project = await loadContentProject({
    cmd: 'validate',
    positionals: [join(dir, '*.md')],
    includeGenericBlocks: false,
    linkOptions: {},
  })
  // with no generic blocks, callout is unknown → an error finding
  expect(project.scan.summary.errors).toBeGreaterThan(0)
})

test('loadContentProject passes scan options through (includeStatsFindings)', async () => {
  // a heading with very few words yields a CB_THIN_SECTION stats finding when enabled
  const dir = await fixture({ 'thin.md': '# Intro\n\ntiny.\n' })
  const withStats = await loadContentProject({
    cmd: 'doctor',
    positionals: [join(dir, '*.md')],
    includeGenericBlocks: true,
    linkOptions: {},
    scan: { includeStatsFindings: true },
  })
  const withoutStats = await loadContentProject({
    cmd: 'validate',
    positionals: [join(dir, '*.md')],
    includeGenericBlocks: true,
    linkOptions: {},
    scan: { includeStatsFindings: false },
  })
  expect(withStats.scan.findings.some((f) => f.source === 'stats')).toBe(true)
  expect(withoutStats.scan.findings.some((f) => f.source === 'stats')).toBe(false)
})
