import { createSeoBrief, formatSeoBriefMarkdown } from '@contentbit/core'
import { glob } from 'tinyglobby'

import type { Io } from '../run.js'

import { loadContentProject } from '../content-project.js'
import { linkResolverOptions, type LinkOptionValues } from '../link-options.js'
import { loadSeoConfig } from '../seo-config.js'

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
  const seoConfig = await loadSeoConfig({ seoConfig: input.seoConfig })
  if (!seoConfig.config) {
    io.stderr(
      'brief: no SEO config found. Add contentbit.seo.config.ts or pass --seo-config <path>.',
    )
    return 2
  }

  const includeGenericBlocks = !input.noGenericBlocks
  const explicitGlobs = input.globs.length > 0
  const globs = explicitGlobs ? input.globs : await defaultBriefGlobs()
  const { scan } = await loadContentProject({
    cmd: 'brief',
    positionals: globs,
    registry: input.registry,
    includeGenericBlocks,
    linkOptions: linkResolverOptions(input),
    scan: { seoConfig: seoConfig.config, seoConfigPath: seoConfig.path },
    allowEmpty: !explicitGlobs && globs.length === 0,
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

async function defaultBriefGlobs(): Promise<string[]> {
  const matches = await glob(DEFAULT_BRIEF_GLOBS)
  return matches.length > 0 ? DEFAULT_BRIEF_GLOBS : []
}
