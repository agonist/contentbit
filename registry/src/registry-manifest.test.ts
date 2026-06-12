import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const root = join(import.meta.dirname, '..')

interface ManifestItem {
  name: string
  dependencies?: string[]
  registryDependencies?: string[]
  files?: Array<{ path: string }>
}

const manifest = JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8')) as {
  items: ManifestItem[]
}

test('manifest declares all 8 blocks, the renderer, and the pack — for both frameworks', () => {
  const names = manifest.items.map((i) => i.name).sort()
  expect(names).toEqual([
    'astro-callout',
    'astro-comparison',
    'astro-content-renderer',
    'astro-faq',
    'astro-key-metrics',
    'astro-pack',
    'astro-pros-cons',
    'astro-quick-ref',
    'astro-steps',
    'astro-tabs',
    'callout',
    'comparison',
    'content-renderer',
    'faq',
    'generic-pack',
    'key-metrics',
    'pros-cons',
    'quick-ref',
    'steps',
    'tabs',
  ])
})

test('astro items depend on @contentbit/astro and target .astro files', () => {
  const astroItems = manifest.items.filter(
    (i) => i.name.startsWith('astro-') && i.name !== 'astro-pack',
  )
  expect(astroItems).toHaveLength(9)
  for (const item of astroItems) {
    expect(item.dependencies, item.name).toContain('@contentbit/astro')
    for (const file of item.files ?? []) {
      expect(file.path, item.name).toMatch(/\.astro$/)
    }
  }
})

test('every declared file exists', () => {
  for (const item of manifest.items) {
    for (const file of item.files ?? []) {
      expect(existsSync(join(root, file.path)), `${item.name}: ${file.path}`).toBe(true)
    }
  }
})

test('interactive items depend on their shadcn primitives', () => {
  const tabs = manifest.items.find((i) => i.name === 'tabs')
  expect(tabs?.registryDependencies).toContain('tabs')
  const faq = manifest.items.find((i) => i.name === 'faq')
  expect(faq?.registryDependencies).toContain('accordion')
})

test('every item declares the runtime packages', () => {
  for (const item of manifest.items) {
    if (item.name === 'generic-pack' || item.name === 'astro-pack') continue
    const framework = item.name.startsWith('astro-') ? '@contentbit/astro' : '@contentbit/react'
    expect(item.dependencies, item.name).toEqual(
      expect.arrayContaining(['@contentbit/core', '@contentbit/blocks', framework]),
    )
  }
})
