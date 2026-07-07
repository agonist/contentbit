export default {
  pageTypes: {
    'docs-page': {
      requiredFrontmatter: ['title', 'description'],
      requiredSections: [{ id: 'overview', headings: ['Overview'] }],
      minOutgoingLinks: 1,
    },
    'blog-post': {
      requiredFrontmatter: ['title', 'description', 'date', 'slug', 'keywords.primary'],
      requiredSections: [{ id: 'overview', headings: ['Overview'] }],
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
      linksTo: ['docs/guides/doctor', 'docs/guides/agents'],
    },
    'content/docs/guides/programmatic-seo.mdx': {
      type: 'docs-page',
      key: 'programmatic-seo',
      slug: 'docs/guides/programmatic-seo',
      title: 'Programmatic SEO workflows',
      description: 'Run contentbit from SEO config to strict doctor checks in CI.',
      intent: 'workflow guide',
      keywords: {
        primary: 'programmatic SEO workflow',
        secondary: ['contentbit doctor CI', 'agent SEO brief workflow'],
      },
      linksTo: ['docs/guides/seo-briefs', 'docs/guides/doctor'],
    },
  },
}
