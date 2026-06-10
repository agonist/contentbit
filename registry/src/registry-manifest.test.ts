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

test('manifest declares all 8 blocks, the renderer, and the pack', () => {
  const names = manifest.items.map((i) => i.name).sort()
  expect(names).toEqual([
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
    if (item.name === 'generic-pack') continue
    expect(item.dependencies, item.name).toEqual(
      expect.arrayContaining([
        '@contentbit/core',
        '@contentbit/blocks',
        '@contentbit/react',
      ]),
    )
  }
})
