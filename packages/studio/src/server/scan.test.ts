import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, expect, test } from 'vitest'

import { scanDocument, scanGraph, scanProject } from './scan'
import { startStudio, type StudioServer } from './index'

const root = fileURLToPath(new URL('../../../..', import.meta.url))
const runningServers: StudioServer[] = []

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.close()))
})

test('scanProject returns health, block, keyword, and link summaries', async () => {
  const dir = await fixture({
    'content/a.md': `---
slug: alpha
linksTo:
  - beta
keywords:
  primary: alpha topic
  secondary: [studio, content]
---

# Alpha

This introduction has enough words to be useful for the healthy fixture.

:::callout{type="tip" title="Keep going"}
This callout body has more than enough words to satisfy the minimum length.
:::
`,
    'content/b.md': `---
slug: beta
linksTo:
  - alpha
keywords:
  primary: beta topic
---

# Beta

This second page closes the loop and keeps the graph free of dangling links.
`,
  })

  const project = await scanProject({
    globs: ['content/*.md'],
    cwd: dir,
    minSectionWords: 0,
  })

  expect(project.summary.files).toBe(2)
  expect(project.summary.errors).toBe(0)
  expect(project.blockUsage.callout).toBe(1)
  expect(project.keywordCoverage.withPrimary).toBe(2)
  expect(project.keywordCoverage.withSecondary).toBe(1)
  expect(project.linkGraph).toMatchObject({ pages: 2, links: 2, orphans: 0 })
})

test('scanProject ranks validation, link, and stats findings', async () => {
  const dir = await fixture({
    'content/a.md': `---
slug: alpha
linksTo:
  - missing-page
keywords:
  primary: alpha topic
---

# Tiny

Short.

![ ](photo.jpg)

:::callout{type="surprise"}
Too short.
:::
`,
    'content/b.md': `---
slug: beta
---

# ${longHeading()}

${Array.from({ length: 260 }, (_, index) => `word${index}`).join(' ')}
`,
  })

  const project = await scanProject({ globs: ['content/*.md'], cwd: dir })
  const codes = project.findings.map((finding) => finding.code)

  expect(codes).toContain('CB_PROPS_INVALID')
  expect(codes).toContain('CB_LINK_UNRESOLVED')
  expect(codes).toContain('CB_THIN_SECTION')
  expect(codes).toContain('CB_BLOCKLESS_DOCUMENT')
  expect(codes).toContain('CB_IMAGE_ALT_MISSING')
  expect(codes.indexOf('CB_PROPS_INVALID')).toBeLessThan(codes.indexOf('CB_LINK_UNRESOLVED'))
})

test('scanProject reads seoKeywords as keyword data', async () => {
  const dir = await fixture({
    'content/oil.md': `---
slug: cooking-oil-smoke-points
seoKeywords:
  primary: cooking oil smoke points
  secondary:
    - oil smoke point chart
  lsi:
    - avocado oil smoke point
---

# Oil Smoke Points

Useful body.
`,
  })

  const project = await scanProject({
    globs: ['content/*.md'],
    cwd: dir,
    minSectionWords: 0,
  })

  expect(project.keywordCoverage).toEqual({ total: 1, withPrimary: 1, withSecondary: 1 })
  expect(project.files[0].keywords).toEqual({
    primary: 'cooking oil smoke points',
    secondary: ['oil smoke point chart'],
    lsi: ['avocado oil smoke point'],
  })
})

test('scanDocument rejects paths outside the matched content set', async () => {
  const dir = await fixture({
    'content/a.md': '---\nslug: alpha\n---\n\n# Alpha\n\nBody.',
    'secret.md': '# Secret',
  })

  await expect(
    scanDocument({ globs: ['content/*.md'], cwd: dir }, '../secret.md'),
  ).resolves.toBeNull()
  await expect(scanDocument({ globs: ['content/*.md'], cwd: dir }, 'secret.md')).resolves.toBeNull()
})

test('scanDocument validates custom registries and previews unknown renderers safely', async () => {
  const dir = await fixture({
    'blocks/registry.mjs': `import { defineBlock, markdownBody } from '@contentbit/core'
import { z } from 'zod'

const quote = defineBlock({
  name: 'quote',
  props: z.object({}),
  content: markdownBody({ minLength: 3 }),
})

export default [quote]
`,
    'content/a.md': `---
slug: alpha
---

# Alpha

:::quote
Custom block content for the local registry.
:::
`,
  })
  await linkContentbitCore(dir)

  const document = await scanDocument(
    { globs: ['content/*.md'], cwd: dir, registryPath: 'blocks/registry.mjs', minSectionWords: 0 },
    'content/a.md',
  )

  expect(document?.findings.filter((finding) => finding.source === 'validation')).toEqual([])
  expect(document?.file.blockNames.quote).toBe(1)
  expect(document?.previewHtml).toContain('<h1>Alpha</h1>')
  expect(document?.previewHtml).toContain('data-cb-custom="quote"')
  expect(document?.previewHtml).toContain('<p>Custom block content for the local registry.</p>')
})

test('scanDocument can let a project registry own generic block names', async () => {
  const dir = await fixture({
    'blocks/registry.mjs': `import { defineBlock, markdownBody } from '@contentbit/core'
import { z } from 'zod'

const quickRef = defineBlock({
  name: 'quick-ref',
  props: z.object({}),
  content: markdownBody({ minLength: 3 }),
})

export default [quickRef]
`,
    'content/a.md': `---
slug: alpha
---

# Alpha

:::quick-ref
Project-owned quick reference content.
:::
`,
  })
  await linkContentbitCore(dir)

  const document = await scanDocument(
    {
      globs: ['content/*.md'],
      cwd: dir,
      registryPath: 'blocks/registry.mjs',
      includeGenericBlocks: false,
      minSectionWords: 0,
    },
    'content/a.md',
  )

  expect(document?.findings.filter((finding) => finding.source === 'validation')).toEqual([])
  expect(document?.file.blockNames['quick-ref']).toBe(1)
  expect(document?.previewHtml).toContain('data-cb-custom="quick-ref"')
})

test('scanGraph returns resolved and unresolved edges', async () => {
  const dir = await fixture({
    'content/a.md': '---\nslug: alpha\nlinksTo:\n  - beta\n  - missing\n---\n\n# Alpha\n\nBody.',
    'content/b.md': '---\nslug: beta\n---\n\n# Beta\n\nBody.',
  })

  const graph = await scanGraph({ globs: ['content/*.md'], cwd: dir, minSectionWords: 0 })

  expect(graph.nodes).toHaveLength(2)
  expect(graph.edges.some((edge) => edge.status === 'resolved' && edge.target === 'beta')).toBe(
    true,
  )
  expect(
    graph.edges.some((edge) => edge.status === 'unresolved' && edge.target === 'missing'),
  ).toBe(true)
})

test('scanProject and scanDocument expose SEO status and briefs', async () => {
  const dir = await fixture({
    'content/a.md': `---
key: alpha-alternatives
slug: alpha-alternatives
type: alternative
intent: commercial
keywords:
  primary: alpha alternatives
---

# Alpha Alternatives

## Overview

Useful overview body.
`,
  })
  const seoConfig = {
    pageTypes: {
      alternative: {
        requiredFrontmatter: ['type', 'intent', 'keywords.primary'],
        requiredSections: [
          { id: 'overview', headings: ['Overview'] },
          { id: 'alternatives', headings: ['Best alternatives'] },
        ],
        minOutgoingLinks: 1,
      },
    },
  }

  const project = await scanProject({
    globs: ['content/*.md'],
    cwd: dir,
    minSectionWords: 0,
    seoConfig,
  })
  expect(project.seo).toMatchObject({
    schemaVersion: 'contentbit.seo.v1',
    pages: 1,
    existing: 1,
    planned: 0,
  })
  expect(project.files[0].seo).toMatchObject({
    id: 'alpha-alternatives',
    source: 'existing',
    type: 'alternative',
    intent: 'commercial',
  })
  expect(project.findings.map((finding) => finding.code)).toContain('CB_SEO_SECTION_MISSING')

  const document = await scanDocument(
    { globs: ['content/*.md'], cwd: dir, minSectionWords: 0, seoConfig },
    'content/a.md',
  )
  expect(document?.seoBrief).toMatchObject({
    schemaVersion: 'contentbit.seo.brief.v1',
    target: { id: 'alpha-alternatives' },
  })
  expect(document?.seoBrief?.acceptanceChecks).toContain(
    'Document includes section: Best alternatives.',
  )
})

test('scanProject and scanDocument cover a Cookwise-style multilingual SEO fixture', async () => {
  const dir = join(root, 'fixtures/real-projects/cookwise-lite')
  const seoConfig = await loadFixtureSeoConfig('cookwise-lite')
  const options = {
    globs: ['content/**/*.md'],
    cwd: dir,
    minSectionWords: 0,
    linkOptions: { resolve: 'same-locale-key' as const },
    seoConfig,
  }

  const project = await scanProject(options)
  expect(project.summary.files).toBe(6)
  expect(project.keywordCoverage).toEqual({ total: 6, withPrimary: 6, withSecondary: 6 })
  expect(project.seo).toMatchObject({
    schemaVersion: 'contentbit.seo.v1',
    pages: 7,
    existing: 6,
    planned: 1,
    findings: 0,
  })
  expect(
    project.files.find(
      (file) => file.relativePath === 'content/blog/cooking-oil-smoke-points/fr.md',
    )?.keywords,
  ).toMatchObject({
    primary: 'point de fumee huile cuisson',
  })

  const document = await scanDocument(options, 'content/blog/cooking-oil-smoke-points/fr.md')
  expect(document?.seoBrief).toMatchObject({
    schemaVersion: 'contentbit.seo.brief.v1',
    target: {
      id: 'blog/cooking-oil-smoke-points:fr',
      key: 'blog/cooking-oil-smoke-points',
      locale: 'fr',
      keywords: { primary: 'point de fumee huile cuisson' },
    },
  })
  expect(document?.linksTo).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        target: 'blog/butter-vs-oil',
        locale: 'fr',
        slug: 'beurre-ou-huile',
        key: 'blog/butter-vs-oil',
      }),
    ]),
  )
  expect(document?.seoBrief?.acceptanceChecks).toContain('Document includes section: Overview.')
})

test('startStudio serves read-only local API responses on port 0', async () => {
  const dir = await fixture({
    'content/a.md': '---\nslug: alpha\n---\n\n# Alpha\n\nReadable body.',
  })
  const server = await startStudio({
    globs: ['content/*.md'],
    cwd: dir,
    port: 0,
    open: false,
    minSectionWords: 0,
  })
  runningServers.push(server)

  const project = (await fetchJson(new URL('/api/project', server.url))) as {
    summary: { files: number }
  }
  const blocked = await fetch(new URL('/api/document?path=../secret.md', server.url))
  const write = await fetch(new URL('/api/project', server.url), { method: 'POST' })

  expect(project.summary.files).toBe(1)
  expect(blocked.status).toBe(404)
  expect(write.status).toBe(405)
})

test('startStudio renders project block components from the registry folder', async () => {
  const dir = await fixture({
    'blocks/registry.mjs': `import { defineBlock, markdownBody } from '@contentbit/core'
import { z } from 'zod'

const quote = defineBlock({
  name: 'quote',
  props: z.object({ author: z.string() }),
  content: markdownBody({ minLength: 3 }),
})

export default [quote]
`,
    'blocks/components.tsx': `import { createElement } from 'react'
import type { BlockComponent } from '@contentbit/react'

export const blockComponents: Record<string, BlockComponent> = {
  quote({ node, ctx }) {
    const data = node.data as { markdown: string }
    return createElement(
      'figure',
      { 'data-project-block': 'quote' },
      createElement('strong', null, String(node.props.author)),
      ctx.renderMarkdown(data.markdown),
    )
  },
}
`,
    'content/a.md': `---
slug: alpha
---

# Alpha

:::quote{author="Ada"}
**Custom block** content from the project.
:::
`,
  })
  await linkContentbitCore(dir)

  const server = await startStudio({
    globs: ['content/*.md'],
    cwd: dir,
    registryPath: 'blocks/registry.mjs',
    port: 0,
    open: false,
    minSectionWords: 0,
  })
  runningServers.push(server)

  const document = (await fetchJson(new URL('/api/document?path=content/a.md', server.url))) as {
    previewHtml: string
  }

  expect(document.previewHtml).toContain('data-project-block="quote"')
  expect(document.previewHtml).toContain('<strong>Ada</strong>')
  expect(document.previewHtml).toContain('<strong>Custom block</strong>')
  expect(document.previewHtml).not.toContain('data-cb-custom="quote"')
})

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-studio-'))
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(dir, path)
    await mkdir(dirname(fullPath), { recursive: true })
    await writeFile(fullPath, content, 'utf8')
  }
  return dir
}

async function linkContentbitCore(dir: string): Promise<void> {
  await mkdir(join(dir, 'node_modules/@contentbit'), { recursive: true })
  await symlink(join(root, 'packages/core'), join(dir, 'node_modules/@contentbit/core'))
  await symlink(join(root, 'packages/react'), join(dir, 'node_modules/@contentbit/react'))
  await symlink(join(root, 'packages/core/node_modules/zod'), join(dir, 'node_modules/zod'))
  await symlink(join(root, 'packages/studio/node_modules/react'), join(dir, 'node_modules/react'))
}

async function loadFixtureSeoConfig(name: string): Promise<unknown> {
  const moduleUrl = pathToFileURL(
    join(root, 'fixtures/real-projects', name, 'contentbit.seo.config.ts'),
  ).href
  const mod = (await import(moduleUrl)) as { default: unknown }
  return mod.default
}

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

function longHeading(): string {
  return 'Long Document'
}
