export default {
  pageTypes: {
    article: {
      requiredFrontmatter: ['name', 'summary', 'seoKeywords.primary'],
      requiredSections: [{ id: 'overview', headings: ['Overview', 'Apercu'] }],
      minOutgoingLinks: 1,
    },
    glossary: {
      requiredFrontmatter: ['name', 'summary', 'seoKeywords.primary'],
      requiredSections: [
        { id: 'why-it-matters', headings: ['Why it matters', 'Pourquoi ca compte'] },
      ],
      minOutgoingLinks: 1,
    },
    feature: {
      requiredFrontmatter: ['title', 'description', 'keywords.primary'],
      requiredSections: [
        { id: 'overview', headings: ['Overview'] },
        { id: 'workflow', headings: ['Workflow'] },
      ],
      requiredLinksTo: ['features/recipe-organizer'],
    },
  },
  pageDefaults: [
    {
      pathPrefix: 'content/blog/',
      type: 'article',
      intent: 'education',
    },
    {
      pathPrefix: 'content/glossary/',
      type: 'glossary',
      intent: 'definition',
    },
  ],
  pages: {
    'content/features/recipe-import-app/en.md': {
      type: 'feature',
      key: 'features/recipe-import-app',
      slug: 'recipe-import-app',
      title: 'Recipe Import App',
      description: 'Save recipes from sites, videos, photos, and handwritten notes.',
      intent: 'commercial',
      keywords: {
        primary: 'recipe import app',
        secondary: ['recipe saver app', 'save recipes from websites'],
      },
      linksTo: ['features/recipe-organizer', 'glossary/recipe-import'],
    },
  },
}
