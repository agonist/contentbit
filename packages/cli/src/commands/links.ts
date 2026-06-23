import {
  aliasReplacementsForPage,
  buildLinkIndex,
  extractFrontmatter,
  formatDiagnostic,
  serializeLinkIndex,
  validateLinks,
} from '@contentbit/core'
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { glob } from 'tinyglobby'

import type { Io } from '../run.js'

import { linkResolverOptions } from '../link-options.js'
import { collectLinkInputs } from '../links-io.js'

export async function linksCommand(args: string[], io: Io): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      fix: { type: 'boolean', default: false },
      'link-resolve': { type: 'string' },
      'locale-field': { type: 'string' },
      'slug-field': { type: 'string' },
      'key-field': { type: 'string' },
      'default-locale': { type: 'string' },
    },
  })
  if (positionals.length === 0) {
    io.stderr('links: provide at least one file or glob.')
    return 2
  }
  const files = (await glob(positionals, { absolute: true })).sort()
  if (files.length === 0) {
    io.stderr(`links: no files matched ${positionals.join(' ')}`)
    return 2
  }

  const inputs = await collectLinkInputs(files)
  const linkOptions = linkResolverOptions(values)

  let errors = 0
  let warnings = 0
  for (const { file, diagnostic } of validateLinks(inputs, linkOptions)) {
    io.stderr(formatDiagnostic(diagnostic, file))
    if (diagnostic.severity === 'error') errors++
    else if (diagnostic.severity === 'warning') warnings++
  }

  const index = buildLinkIndex(inputs, linkOptions)

  if (values.fix && errors > 0) {
    io.stderr('links: --fix skipped because link errors must be resolved first.')
  } else if (values.fix && index.aliases.size > 0) {
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

  const outPath = values.out ?? join(process.cwd(), '.contentbit', 'link-index.json')
  // The default target lives in a .contentbit/ dir that may not exist yet, and
  // the shared Io.writeFile is a thin fs wrapper that won't create it.
  await mkdir(dirname(outPath), { recursive: true })
  await io.writeFile(outPath, JSON.stringify(serializeLinkIndex(index), null, 2) + '\n')

  let edges = 0
  for (const p of index.pages.values()) edges += p.linksTo.length
  const orphans = [...index.pages.values()].filter((p) => p.linkedFrom.length === 0).length
  io.stdout(
    `${index.pages.size} page(s), ${edges} link(s), ${orphans} orphan(s): ${errors} errors, ${warnings} warnings`,
  )
  io.stdout(`index written to ${outPath}`)
  return errors > 0 ? 1 : 0
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
