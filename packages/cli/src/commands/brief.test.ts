import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'

import { run } from '../run'
import { fakeIo } from '../run.test'

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-brief-'))
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, 'utf8')
  }
  return dir
}

function seoConfig(): string {
  return `
export default {
  pageTypes: {
    alternative: {
      requiredFrontmatter: ["type", "intent", "keywords.primary"],
      requiredSections: [
        { id: "overview", headings: ["Overview", "Summary"] },
        { id: "alternatives", headings: ["Best alternatives", "Top alternatives"] }
      ],
      requiredBlocks: ["comparison"],
      recommendedBlocks: ["faq"],
      requiredLinksTo: ["seo-tools-comparison"],
      minOutgoingLinks: 2
    }
  },
  pages: {
    "ahrefs-alternatives": {
      type: "alternative",
      key: "ahrefs-alternatives",
      slug: "ahrefs-alternatives",
      title: "Ahrefs Alternatives",
      intent: "commercial",
      keywords: { primary: "ahrefs alternatives" },
      linksTo: ["seo-tools-comparison"]
    }
  }
};
`
}

test('brief prints a Markdown brief for a planned page', async () => {
  const dir = await fixture({ 'seo.mjs': seoConfig() })
  const io = fakeIo()

  expect(
    await run(['brief', 'ahrefs-alternatives', '--seo-config', join(dir, 'seo.mjs')], io),
  ).toBe(0)

  const out = io.out.join('\n')
  expect(out).toContain('# SEO Brief: Ahrefs Alternatives')
  expect(out).toContain('Primary keyword: ahrefs alternatives')
  expect(out).toContain('Create the Markdown source file for this planned page.')
})

test('brief --json emits a versioned contract', async () => {
  const dir = await fixture({ 'seo.mjs': seoConfig() })
  const io = fakeIo()

  expect(
    await run(['brief', 'ahrefs-alternatives', '--seo-config', join(dir, 'seo.mjs'), '--json'], io),
  ).toBe(0)

  const report = JSON.parse(io.out.join('\n'))
  expect(report).toMatchObject({
    schemaVersion: 'contentbit.seo.brief.v1',
    target: { id: 'ahrefs-alternatives', source: 'planned' },
  })
  expect(report.target.stats).toBeUndefined()
})

test('brief requires an SEO config', async () => {
  const io = fakeIo()

  expect(await run(['brief', 'missing-page'], io)).toBe(2)
  expect(io.err.join('\n')).toContain('brief: no SEO config found')
})

test('brief reports a clean error when the target is unknown', async () => {
  const dir = await fixture({ 'seo.mjs': seoConfig() })
  const io = fakeIo()

  expect(await run(['brief', 'missing-page', '--seo-config', join(dir, 'seo.mjs')], io)).toBe(1)
  expect(io.err.join('\n')).toContain('brief: SEO brief target not found: missing-page')
})
