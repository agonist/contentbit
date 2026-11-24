import {
  aliasReplacementsForPage,
  buildLinkIndex,
  extractFrontmatter,
  linkGraphSummary,
  serializeLinkIndex,
  validateLinks,
  type LinkIndex,
  type LinkInput,
} from '@contentbit/core'
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { Io } from '../run.js'

import { resolveContentCommandConfig } from '../command-config.js'
import { formatDiagnosticForCli, formatRows, section } from '../cli-format.js'
import { resolveContentFiles } from '../content-project.js'
import type { LinkOptionValues } from '../link-options.js'
import { collectLinkInputs } from '../links-io.js'

export interface LinksCommandInput extends LinkOptionValues {
  globs: string[]
  out?: string
  fix?: boolean
}

export async function linksCommand(input: LinksCommandInput, io: Io): Promise<number> {
  const config = await resolveContentCommandConfig('links', input)
  const files = await resolveContentFiles(config.globs, 'links', { cwd: config.cwd })

  const inputs = await collectLinkInputs(files)
  const linkOptions = config.resolveLinkOptions()

  let errors = 0
  let warnings = 0
  for (const { file, diagnostic } of validateLinks(inputs, linkOptions)) {
    io.stderr(formatDiagnosticForCli(diagnostic, file))
    if (diagnostic.severity === 'error') errors++
    else if (diagnostic.severity === 'warning') warnings++
  }

  let index = buildLinkIndex(inputs, linkOptions)

  if (input.fix && errors > 0) {
    io.stderr('links: --fix skipped because link errors must be resolved first.')
  } else if (input.fix && index.aliases.size > 0) {
    index = buildLinkIndex(await fixAliasReferences(inputs, index, io), linkOptions)
  }

  const outPath = input.out ?? join(config.cwd ?? process.cwd(), '.contentbit', 'link-index.json')
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

// Rewrites each page's linksTo entries that resolved through an alias, and
// returns the inputs as the files read after the fix.
async function fixAliasReferences(
  inputs: LinkInput[],
  index: LinkIndex,
  io: Io,
): Promise<LinkInput[]> {
  const fixed: LinkInput[] = []
  for (const linkInput of inputs) {
    const replacements = aliasReplacementsForPage(index, linkInput.data)
    if (replacements.size === 0) {
      fixed.push(linkInput)
      continue
    }
    const source = await readFile(linkInput.path, 'utf8')
    const next = rewriteLinksTo(source, replacements)
    if (next !== source) {
      await io.writeFile(linkInput.path, next)
      io.stdout(`fixed alias references in ${linkInput.path}`)
    }
    fixed.push({ path: linkInput.path, data: extractFrontmatter(next)?.data ?? {} })
  }
  return fixed
}

// Replaces whole entries of the top-level `linksTo` list, in dash or inline
// form, so `guide` never matches inside `setup-guide`. The `aliases:` list and
// the body stay untouched. Each line keeps its own ending (LF or CRLF), and
// each entry keeps its quotes. The block ends where the frontmatter parser
// ends it: at a blank line or the next unindented line.
function rewriteLinksTo(source: string, replacements: Map<string, string>): string {
  const lines = source.split('\n')
  const closingFence = (extractFrontmatter(source)?.lines.end ?? 0) - 1
  let inLinksTo = false
  for (let i = 1; i < closingFence; i++) {
    const eol = lines[i].endsWith('\r') ? '\r' : ''
    const line = lines[i].slice(0, lines[i].length - eol.length)
    const key = line.match(/^([A-Za-z0-9_.-]+):(.*)$/)
    if (key) {
      inLinksTo = key[1] === 'linksTo'
      if (inLinksTo) lines[i] = `linksTo:${rewriteInlineList(key[2], replacements)}${eol}`
      continue
    }
    if (!/^[ \t]+\S/.test(line)) inLinksTo = false
    const item = inLinksTo ? line.match(/^(\s*- )(.*)$/) : null
    if (item) lines[i] = item[1] + rewriteEntry(item[2], replacements) + eol
  }
  return lines.join('\n')
}

function rewriteInlineList(value: string, replacements: Map<string, string>): string {
  const list = value.match(/^(\s*\[)(.*)(\]\s*)$/)
  if (!list) return value
  const entries = splitInlineEntries(list[2]).map((entry) => rewriteEntry(entry, replacements))
  return list[1] + entries.join(',') + list[3]
}

// Splits on commas outside quotes, keeping each entry's surrounding spaces.
function splitInlineEntries(inner: string): string[] {
  const entries = ['']
  let quote = ''
  for (const ch of inner) {
    if (!quote && ch === ',') {
      entries.push('')
      continue
    }
    if (quote ? ch === quote : ch === '"' || ch === "'") quote = quote ? '' : ch
    entries[entries.length - 1] += ch
  }
  return entries
}

function rewriteEntry(raw: string, replacements: Map<string, string>): string {
  const [, lead, value, trail] = raw.match(/^(\s*)(.*?)(\s*)$/)!
  const quote = /^(["']).*\1$/.test(value) ? value[0] : ''
  const replacement = replacements.get(quote ? value.slice(1, -1) : value)
  if (replacement === undefined) return raw
  if (quote === '"') return lead + JSON.stringify(replacement) + trail
  if (quote === "'") return `${lead}'${replacement.replaceAll("'", "''")}'${trail}`
  return lead + replacement + trail
}
