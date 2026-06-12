// Custom block definitions for this project. The CLI and your app share
// this module — Node 22.18+ imports TypeScript directly:
//
//   contentbit validate "content/**/*.md" --registry ./blocks/registry.ts
//
// Definitions stay framework-free (the CLI and every render target use
// them); React components live next door in blocks/components.tsx.
// Docs: https://contentbit.dev/docs/guides/custom-blocks
import { defineBlock, markdownBody, type BlockDefinition } from '@contentbit/core'
import { z } from 'zod'

export const quote = defineBlock({
  name: 'quote',
  description: 'A pull quote with an author.',
  props: z.object({
    author: z.string().min(1),
    role: z.string().optional(),
  }),
  content: markdownBody({ minLength: 3 }),
  authoring: {
    useWhen: ['Quoting a person to support a point'],
    avoidWhen: ['Highlighting your own remark, use callout instead'],
    example:
      ':::quote{author="Ada Lovelace"}\nThe Analytical Engine weaves algebraic patterns.\n:::',
  },
})

export default [quote] satisfies BlockDefinition<unknown>[]
