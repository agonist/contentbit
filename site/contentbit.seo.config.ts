import { defineSeoConfig } from '@contentbit/core'

export default defineSeoConfig({
  pageTypes: {
    'docs-page': {
      requiredFrontmatter: ['title', 'description'],
    },
    'blog-post': {
      requiredFrontmatter: ['title', 'description', 'date', 'slug', 'keywords.primary'],
      requiredBlocks: ['callout'],
      recommendedBlocks: ['faq'],
      minOutgoingLinks: 1,
    },
  },
  pageDefaults: [
    {
      pathPrefix: 'content/docs/',
      type: 'docs-page',
      intent: 'documentation',
    },
    {
      pathPrefix: 'content/blog/',
      type: 'blog-post',
      intent: 'publication',
    },
  ],
  pages: {
    'content/docs/guides/seo-briefs.mdx': {
      type: 'docs-page',
      key: 'seo-briefs',
      slug: 'docs/guides/seo-briefs',
      title: 'SEO briefs and contracts',
      description: 'Use contentbit SEO contracts to give agents structure before they write.',
      intent: 'programmatic SEO structure',
      keywords: {
        primary: 'programmatic SEO briefs',
        secondary: ['SEO content contracts', 'agent SEO brief'],
      },
      linksTo: [
        'docs/guides/programmatic-seo',
        'docs/guides/doctor',
        'docs/guides/agents',
        'docs/guides/internal-linking',
      ],
    },
    'content/docs/guides/programmatic-seo.mdx': {
      type: 'docs-page',
      key: 'programmatic-seo',
      slug: 'docs/guides/programmatic-seo',
      title: 'Programmatic SEO workflows',
      description:
        'Use contentbit to plan, write, inspect, and enforce search-targeted pages with agents.',
      intent: 'programmatic SEO workflow',
      keywords: {
        primary: 'programmatic SEO workflow',
        secondary: ['contentbit SEO workflow', 'agent SEO brief workflow'],
      },
      linksTo: ['docs/guides/seo-briefs', 'docs/guides/studio', 'docs/guides/doctor'],
    },
  },
})
