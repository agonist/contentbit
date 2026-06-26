import { defineSeoConfig } from '@contentbit/core'

export default defineSeoConfig({
  pageTypes: {
    'docs-home': {
      requiredFrontmatter: ['title', 'description'],
      requiredSections: ['Next steps'],
    },
    'docs-guide': {
      requiredFrontmatter: ['title', 'description'],
    },
    'docs-concept': {
      requiredFrontmatter: ['title', 'description'],
    },
    'docs-reference': {
      requiredFrontmatter: ['title', 'description'],
      requiredSections: ['callout', 'comparison', 'faq'],
    },
    changelog: {
      requiredFrontmatter: ['title', 'description'],
      requiredSections: ['Next'],
    },
    'ops-doc': {
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
      path: 'content/docs/index.mdx',
      type: 'docs-home',
      intent: 'product onboarding',
    },
    {
      path: 'content/docs/changelog.mdx',
      type: 'changelog',
      intent: 'release discovery',
    },
    {
      path: 'content/docs/release-checklist.mdx',
      type: 'ops-doc',
      intent: 'internal release operations',
    },
    {
      pathPrefix: 'content/docs/guides/',
      type: 'docs-guide',
      intent: 'documentation',
    },
    {
      pathPrefix: 'content/docs/concepts/',
      type: 'docs-concept',
      intent: 'concept education',
    },
    {
      pathPrefix: 'content/docs/reference/',
      type: 'docs-reference',
      intent: 'reference',
    },
    {
      pathPrefix: 'content/blog/',
      type: 'blog-post',
      intent: 'publication',
    },
  ],
  pages: {
    'content/docs/guides/seo-briefs.mdx': {
      type: 'docs-guide',
      key: 'seo-briefs',
      slug: 'docs/guides/seo-briefs',
      title: 'SEO briefs and contracts',
      description: 'Use contentbit SEO contracts to give agents structure before they write.',
      intent: 'programmatic SEO structure',
      keywords: {
        primary: 'programmatic SEO briefs',
        secondary: ['SEO content contracts', 'agent SEO brief'],
      },
      linksTo: ['docs/guides/doctor', 'docs/guides/agents', 'docs/guides/internal-linking'],
    },
  },
})
