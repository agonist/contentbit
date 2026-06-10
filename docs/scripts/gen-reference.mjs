import { genericBlocks } from '@content-blocks/blocks'
import { createBlockRegistry } from '@content-blocks/core'
import { mkdir, writeFile } from 'node:fs/promises'

const registry = createBlockRegistry().use(genericBlocks())

const guide = registry.toAuthoringGuide({
  audience: 'human',
  includeExamples: true,
})

// Top-level blocks render standalone; child-only blocks (tab, faq-item) only
// make sense inside a parent, so their examples stay as plain code fences.
const standalone = new Set(registry.all().filter((d) => !d.childOnly).map((d) => d.name))

/*
 * The guide emits each block's example inside a ```md fence. Turn that fence into
 * a <Live> block so the reference renders every example through the real library —
 * source beside styled output — exactly like the rest of the docs. Only the
 * example fence that closes a standalone block's section is converted.
 */
function liveifyExamples(markdown) {
  const sections = markdown.split(/^## /m)
  return sections
    .map((section, i) => {
      if (i === 0) return section // preamble before the first heading
      const name = section.slice(0, section.indexOf('\n')).trim()
      if (!standalone.has(name)) return `## ${section}`
      // Escape only what breaks a JS template literal: backticks and ${ .
      const converted = section.replace(/```md\n([\s\S]*?)\n```/, (_, src) => {
        const escaped = src.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
        return `<Live>\n{\`${escaped}\`}\n</Live>`
      })
      return `## ${converted}`
    })
    .join('')
}

const page = `---
title: Block reference
description: Every built-in block, generated from the registry.
---

{/* GENERATED FILE — do not edit. Run scripts/gen-reference.mjs */}

${liveifyExamples(guide)}`

await mkdir(new URL('../content/docs/reference/', import.meta.url), { recursive: true })
await writeFile(new URL('../content/docs/reference/blocks.mdx', import.meta.url), page, 'utf8')
console.log('generated reference/blocks.mdx')
