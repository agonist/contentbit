import { createSeoBrief, formatSeoBriefMarkdown } from '@contentbit/core'
import { glob } from 'tinyglobby'

import type { Io } from '../run.js'

import { loadContentProject } from '../content-project.js'
import { linkResolverOptions, type LinkOptionValues } from '../link-options.js'
import { loadSeoConfig } from '../seo-config.js'
import { discoverContentCommandDefaults } from '../script-defaults.js'

const DEFAULT_BRIEF_GLOBS = ['content/**/*.{md,mdx}']

export interface BriefCommandInput extends LinkOptionValues {
  target: string
  globs: string[]
  registry?: string
  noGenericBlocks?: boolean
  seoConfig?: string
  json?: boolean
}

export async function briefCommand(input: BriefCommandInput, io: Io): Promise<number> {
  const defaults = await discoverContentCommandDefaults('brief', input.globs)
  const seoConfig = await loadSeoConfig({
    cwd: defaults.cwd,
    seoConfig: input.seoConfig ?? defaults.seoConfig,
    noSeo: defaults.noSeo,
  })
  if (!seoConfig.config) {
    io.stderr(
      'brief: no SEO config found. Add contentbit.seo.config.ts or pass --seo-config <path>.',
    )
    return 2
  }

  const includeGenericBlocks = !(input.noGenericBlocks || defaults.noGenericBlocks)
  const globs = defaults.globs.length > 0 ? defaults.globs : await defaultBriefGlobs(defaults.cwd)
  const { scan } = await loadContentProject({
    cmd: 'brief',
    positionals: globs,
    cwd: defaults.cwd,
    registry: input.registry ?? defaults.registry,
    includeGenericBlocks,
    linkOptions: linkResolverOptions({
      linkResolve: input.linkResolve ?? defaults.linkResolve,
      localeField: input.localeField ?? defaults.localeField,
      slugField: input.slugField ?? defaults.slugField,
      keyField: input.keyField ?? defaults.keyField,
      defaultLocale: input.defaultLocale ?? defaults.defaultLocale,
    }),
    scan: { seoConfig: seoConfig.config, seoConfigPath: seoConfig.path },
    allowEmpty: globs.length === 0,
  })

  if (!scan.seo) {
    io.stderr('brief: SEO scan did not produce a result.')
    return 1
  }
  const configErrors = scan.seo.findings.filter((finding) => finding.severity === 'error')
  if (configErrors.length > 0) {
    for (const finding of configErrors) io.stderr(`${finding.file}: ${finding.message}`)
    return 1
  }

  let brief: ReturnType<typeof createSeoBrief>
  try {
    brief = createSeoBrief(scan.seo, input.target)
  } catch (err) {
    io.stderr(err instanceof Error ? `brief: ${err.message}` : `brief: ${String(err)}`)
    return 1
  }
  if (input.json) io.stdout(JSON.stringify(brief, null, 2))
  else io.stdout(formatSeoBriefMarkdown(brief))
  return 0
}

async function defaultBriefGlobs(cwd?: string): Promise<string[]> {
  const matches = await glob(DEFAULT_BRIEF_GLOBS, { cwd })
  return matches.length > 0 ? DEFAULT_BRIEF_GLOBS : []
}
