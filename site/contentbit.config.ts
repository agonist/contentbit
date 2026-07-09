import { defineContentConfig } from '@contentbit/core'

export default defineContentConfig({
  content: 'content/**/*.{md,mdx}',
  seo: './contentbit.seo.config.ts',
})
