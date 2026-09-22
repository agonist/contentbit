import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, expect, test } from 'vitest'

import { resolveContentCommandConfig } from './command-config.js'

const projects: string[] = []

afterEach(async () => {
  await Promise.all(projects.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-command-config-'))
  projects.push(root)
  for (const [name, source] of Object.entries(files)) {
    const path = join(root, name)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, source)
  }
  return root
}

const contentConfig = `export default {
  content: ['content/**/*.md'],
  registry: './blocks/registry.mjs',
  genericBlocks: false,
  links: { resolve: 'same-locale-key', keyField: 'id', localeField: 'lang' },
  seo: './seo.mjs',
}`
const seoConfig = 'export default { pageTypes: { guide: {} }, pages: {} }'

test.each(['validate', 'doctor', 'studio', 'links', 'stats', 'brief', 'snapshot'] as const)(
  '%s resolves project config from a nested directory ahead of script defaults',
  async (command) => {
    const root = await project({
      'contentbit.config.mjs': contentConfig,
      'seo.mjs': seoConfig,
      'nested/.keep': '',
      'package.json': JSON.stringify({
        scripts: { 'content:check': 'contentbit validate legacy/*.md --registry missing.mjs' },
      }),
    })
    const config = await resolveContentCommandConfig(command, { globs: [] }, join(root, 'nested'))

    expect(config).toMatchObject({
      globs: ['content/**/*.md'],
      cwd: root,
      registry: join(root, 'blocks/registry.mjs'),
      includeGenericBlocks: false,
    })
    expect(config.resolveLinkOptions()).toEqual({
      resolve: 'same-locale-key',
      keyField: 'id',
      localeField: 'lang',
    })
    expect(await config.loadSeo()).toEqual({
      config: { pageTypes: { guide: {} }, pages: {} },
      path: join(root, 'seo.mjs'),
    })
  },
)

test('explicit globs retain invocation-relative paths while config paths stay project-relative', async () => {
  const root = await project({
    'contentbit.config.mjs': contentConfig,
    'seo.mjs': seoConfig,
    'nested/.keep': '',
  })
  const config = await resolveContentCommandConfig(
    'doctor',
    { globs: ['drafts/*.md'], linkResolve: 'global-slug', slugField: 'url' },
    join(root, 'nested'),
  )
  expect(config).toMatchObject({
    globs: ['drafts/*.md'],
    cwd: undefined,
    registry: join(root, 'blocks/registry.mjs'),
    includeGenericBlocks: false,
  })
  expect(config.resolveLinkOptions()).toEqual({
    resolve: 'global-slug',
    slugField: 'url',
    keyField: 'id',
    localeField: 'lang',
  })
  expect((await config.loadSeo()).path).toBe(join(root, 'seo.mjs'))

  const overridden = await resolveContentCommandConfig(
    'doctor',
    { globs: ['drafts/*.md'], registry: './custom.mjs' },
    join(root, 'nested'),
  )
  expect(overridden.registry).toBe('./custom.mjs')
})

test('script fallback preserves quoted globs, its directory, and explicit flag overrides', async () => {
  const root = await project({
    'nested/.keep': '',
    'seo.mjs': seoConfig,
    'package.json': JSON.stringify({
      scripts: {
        'content:doctor':
          'pnpm exec contentbit doctor "articles with spaces/*.md" --registry=blocks.mjs --seo-config seo.mjs --no-generic-blocks --link-resolve same-locale-key --key-field id && echo done',
        'content:check': 'contentbit validate wrong/*.md',
      },
    }),
  })
  const config = await resolveContentCommandConfig(
    'doctor',
    { globs: [], registry: 'override.mjs', linkResolve: 'global-slug' },
    join(root, 'nested'),
  )
  expect(config).toMatchObject({
    globs: ['articles with spaces/*.md'],
    cwd: root,
    registry: 'override.mjs',
    includeGenericBlocks: false,
  })
  expect(config.resolveLinkOptions()).toEqual({ resolve: 'global-slug', keyField: 'id' })
  expect((await config.loadSeo()).path).toBe(join(root, 'seo.mjs'))
})

test('content:check is the compatibility fallback; explicit globs bypass script settings', async () => {
  const root = await project({
    'package.json': JSON.stringify({
      scripts: { 'content:check': 'contentbit validate content/*.md --no-generic-blocks' },
    }),
  })
  const fallback = await resolveContentCommandConfig('snapshot', { globs: [] }, root)
  expect(fallback).toMatchObject({
    globs: ['content/*.md'],
    cwd: root,
    includeGenericBlocks: false,
  })
  const explicit = await resolveContentCommandConfig('snapshot', { globs: ['drafts/*.md'] }, root)
  expect(explicit).toMatchObject({
    globs: ['drafts/*.md'],
    cwd: undefined,
    includeGenericBlocks: true,
  })
})

test.each(['doctor', 'snapshot', 'studio', 'brief'] as const)(
  '%s centralizes explicit SEO precedence over disabled defaults',
  async (command) => {
    const root = await project({
      'contentbit.config.mjs': "export default { content: 'content/*.md', seo: false }",
      'seo.mjs': seoConfig,
    })
    const disabled = await resolveContentCommandConfig(command, { globs: [] }, root)
    expect(await disabled.loadSeo()).toEqual({})
    const enabled = await resolveContentCommandConfig(
      command,
      { globs: [], seoConfig: './seo.mjs' },
      root,
    )
    expect((await enabled.loadSeo()).config).toEqual({ pageTypes: { guide: {} }, pages: {} })
    const explicitDisable = await resolveContentCommandConfig(
      command,
      { globs: [], seoConfig: './missing.mjs', noSeo: true },
      root,
    )
    expect(await explicitDisable.loadSeo()).toEqual({})
  },
)

test('default SEO discovery stays relative to the selected project', async () => {
  const root = await project({
    'contentbit.config.mjs': "export default { content: 'content/*.md' }",
    'contentbit.seo.config.ts': seoConfig,
  })
  const config = await resolveContentCommandConfig('doctor', { globs: [] }, root)
  expect((await config.loadSeo()).path).toBe(join(root, 'contentbit.seo.config.ts'))
})

test('optional settings fail only when requested, preserving command-specific checks', async () => {
  const root = await project({
    'contentbit.config.mjs': `export default {
      content: 'content/*.md', seo: './bad-seo.mjs', links: { resolve: 'invalid' },
    }`,
    'bad-seo.mjs': 'throw new Error("SEO import requested")',
  })
  const config = await resolveContentCommandConfig('stats', { globs: [] }, root)
  expect(config.globs).toEqual(['content/*.md'])
  expect(() => config.resolveLinkOptions()).toThrow('invalid --link-resolve invalid')
  await expect(config.loadSeo()).rejects.toThrow('SEO import requested')
})

test('missing defaults keep the empty-input policy with the command', async () => {
  const root = await project({})
  const config = await resolveContentCommandConfig('brief', { globs: [] }, root)
  expect(config).toMatchObject({
    globs: [],
    cwd: undefined,
    registry: undefined,
    includeGenericBlocks: true,
  })
  expect(config.resolveLinkOptions()).toEqual({})
})
