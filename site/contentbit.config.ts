import { defineContentConfig } from '@contentbit/core'

export default defineContentConfig({
  content: 'content/**/*.{md,mdx}',
  links: {
    routes: { content: '/{path}' },
    hostRoutes: ['/blocks', '/blog', '/playground', '/programmatic-seo'],
  },
  seo: './contentbit.seo.config.ts',
})
