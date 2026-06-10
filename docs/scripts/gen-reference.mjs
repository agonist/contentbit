import { genericBlocks } from '@content-blocks/blocks'
import { createBlockRegistry } from '@content-blocks/core'
import { mkdir, writeFile } from 'node:fs/promises'

const guide = createBlockRegistry().use(genericBlocks()).toAuthoringGuide({
  audience: 'human',
  includeExamples: true,
})
const page = `---
title: Block reference
description: Every built-in block, generated from the registry.
---

{/* GENERATED FILE — do not edit. Run scripts/gen-reference.mjs */}

${guide}`
await mkdir(new URL('../content/docs/reference/', import.meta.url), { recursive: true })
await writeFile(new URL('../content/docs/reference/blocks.mdx', import.meta.url), page, 'utf8')
console.log('generated reference/blocks.mdx')
