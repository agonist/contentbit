import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

export const collections = {
  articles: defineCollection({
    // Astro's builtin Markdown loader. Entry bodies are parsed and validated
    // where they render (see src/pages/blog/[slug].astro); `contentbit validate`
    // covers the same files in CI.
    loader: glob({ pattern: '**/*.md', base: './content' }),
  }),
}
