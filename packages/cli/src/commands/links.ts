import {
  aliasReplacementsForPage,
  buildLinkIndex,
  extractFrontmatter,
  linkGraphSummary,
  serializeLinkIndex,
  validateLinks,
} from '@contentbit/core'
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { Io } from '../run.js'

import { formatDiagnosticForCli, formatRows, section } from '../cli-format.js'
import { resolveContentFiles } from '../content-project.js'
import { linkResolverOptions, type LinkOptionValues } from '../link-options.js'
import { collectLinkInputs } from '../links-io.js'
import { discoverContentCommandDefaults } from '../script-defaults.js'

export interface LinksCommandInput extends LinkOptionValues {
  globs: string[]
  out?: string
  fix?: boolean
}

export async function linksCommand(input: LinksCommandInput, io: Io): Promise<number> {
  const defaults = await discoverContentCommandDefaults('links', input.globs)
  const files = await resolveContentFiles(defaults.globs, 'links', { cwd: defaults.cwd })

  const inputs = await collectLinkInputs(files)
  const linkOptions = linkResolverOptions({
    linkResolve: input.linkResolve ?? defaults.linkResolve,
    localeField: input.localeField ?? defaults.localeField,
    slugField: input.slugField ?? defaults.slugField,
    keyField: input.keyField ?? defaults.keyField,
    defaultLocale: input.defaultLocale ?? defaults.defaultLocale,
  })

  let errors = 0
  let warnings = 0
  for (const { file, diagnostic } of validateLinks(inputs, linkOptions)) {
    io.stderr(formatDiagnosticForCli(diagnostic, file))
    if (diagnostic.severity === 'error') errors++
    else if (diagnostic.severity === 'warning') warnings++
  }

  const index = buildLinkIndex(inputs, linkOptions)

  if (input.fix && errors > 0) {
    io.stderr('links: --fix skipped because link errors must be resolved first.')
  } else if (input.fix && index.aliases.size > 0) {
    for (const file of files) {
      const source = await readFile(file, 'utf8')
      const fm = extractFrontmatter(source)
      if (!fm) continue
      const lines = source.split('\n')
      let changed = false
      // Only rewrite alias tokens inside the `linksTo:` block — never inside an
      // `aliases:` list (which records the rename and must stay intact), and
      // never in document body. Track whether we are within linksTo's scope:
      // a top-level key resets it, dash-list / inline continuation keeps it.
      let inLinksTo = false
      for (let i = 0; i < fm.lines.end && i < lines.length; i++) {
        const line = lines[i]
        const topKey = line.match(/^([A-Za-z0-9_.-]+):(.*)$/)
        if (topKey) inLinksTo = topKey[1] === 'linksTo'
        if (!inLinksTo) continue
        let next = line
        for (const [alias, current] of aliasReplacementsForPage(index, fm.data)) {
          const re = new RegExp(`(^|[\\s\\[,'"-])${escapeRe(alias)}($|[\\s\\],'"])`, 'g')
          next = next.replace(re, (_m, p1, p2) => `${p1}${current}${p2}`)
        }
        if (next !== line) {
          lines[i] = next
          changed = true
        }
      }
      if (changed) {
        await io.writeFile(file, lines.join('\n'))
        io.stdout(`fixed alias references in ${file}`)
      }
    }
  }

  const outPath = input.out ?? join(defaults.cwd ?? process.cwd(), '.contentbit', 'link-index.json')
  // The default target lives in a .contentbit/ dir that may not exist yet, and
  // the shared Io.writeFile is a thin fs wrapper that won't create it.
  await mkdir(dirname(outPath), { recursive: true })
  await io.writeFile(outPath, JSON.stringify(serializeLinkIndex(index), null, 2) + '\n')

  const graph = linkGraphSummary(index)
  io.stdout(
    [
      section('Link Index'),
      ...formatRows([
        { label: 'Pages', value: graph.pages },
        { label: 'Links', value: graph.links },
        { label: 'Orphans', value: graph.orphans, tone: graph.orphans > 0 ? 'warning' : 'success' },
        { label: 'Errors', value: errors, tone: errors > 0 ? 'error' : 'success' },
        { label: 'Warnings', value: warnings, tone: warnings > 0 ? 'warning' : 'success' },
      ]),
      '',
      section('Written'),
      `  ${outPath}`,
    ].join('\n'),
  )
  return errors > 0 ? 1 : 0
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
