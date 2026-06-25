import { defineSeoConfig } from '@contentbit/core'

export default defineSeoConfig({
  pageTypes: {
    'docs-home': {
      requiredFrontmatter: ['type', 'title', 'description', 'slug', 'intent', 'keywords.primary'],
      requiredSections: ['Next steps'],
      minOutgoingLinks: 3,
    },
    'docs-guide': {
      requiredFrontmatter: ['type', 'title', 'description', 'slug', 'intent', 'keywords.primary'],
      minOutgoingLinks: 1,
    },
    'docs-concept': {
      requiredFrontmatter: ['type', 'title', 'description', 'slug', 'intent', 'keywords.primary'],
    },
    'docs-reference': {
      requiredFrontmatter: ['type', 'title', 'description', 'slug', 'intent', 'keywords.primary'],
      requiredSections: ['callout', 'comparison', 'faq'],
    },
    changelog: {
      requiredFrontmatter: ['type', 'title', 'description', 'slug', 'intent', 'keywords.primary'],
      requiredSections: ['Next'],
      minOutgoingLinks: 1,
    },
    'ops-doc': {
      requiredFrontmatter: ['type', 'title', 'description', 'slug', 'intent'],
    },
    'blog-post': {
      requiredFrontmatter: [
        'type',
        'title',
        'description',
        'date',
        'slug',
        'intent',
        'keywords.primary',
      ],
      requiredBlocks: ['callout'],
      recommendedBlocks: ['faq'],
      minOutgoingLinks: 1,
    },
  },
  pages: {
    'content/docs/index.mdx': {
      type: 'docs-home',
      key: 'docs-home',
      slug: 'docs',
      intent: 'product onboarding',
      keywords: {
        primary: 'contentbit docs',
        secondary: ['structured markdown components', 'LLM content validation'],
      },
      linksTo: [
        'docs/guides/agents',
        'docs/guides/markdown',
        'docs/guides/doctor',
        'docs/guides/internal-linking',
        'docs/reference/blocks',
      ],
    },
    'content/docs/guides/agents.mdx': {
      type: 'docs-guide',
      key: 'agents',
      slug: 'docs/guides/agents',
      intent: 'agent setup',
      keywords: {
        primary: 'LLM agent content workflow',
        secondary: ['contentbit agents', 'Claude Code content skills'],
      },
      linksTo: ['docs/concepts/llm-authoring', 'docs/guides/doctor', 'docs/guides/stats'],
    },
    'content/docs/guides/studio.mdx': {
      type: 'docs-guide',
      key: 'studio',
      slug: 'docs/guides/studio',
      intent: 'content dashboard',
      keywords: {
        primary: 'content studio',
        secondary: ['content health dashboard', 'Markdown content preview'],
      },
      linksTo: ['docs/guides/doctor', 'docs/guides/stats'],
    },
    'content/docs/guides/doctor.mdx': {
      type: 'docs-guide',
      key: 'doctor',
      slug: 'docs/guides/doctor',
      intent: 'content audit',
      keywords: {
        primary: 'content doctor',
        secondary: ['content audit CLI', 'Markdown health checks'],
      },
      linksTo: ['docs/guides/stats', 'docs/guides/internal-linking'],
    },
    'content/docs/guides/renderers.mdx': {
      type: 'docs-guide',
      key: 'renderers',
      slug: 'docs/guides/renderers',
      intent: 'renderer selection',
      keywords: {
        primary: 'Markdown content renderers',
        secondary: ['React Markdown renderer', 'Astro content renderer'],
      },
      linksTo: ['docs/guides/astro', 'docs/guides/markdown'],
    },
    'content/docs/guides/internal-linking.mdx': {
      type: 'docs-guide',
      key: 'internal-linking',
      slug: 'docs/guides/internal-linking',
      intent: 'content graph',
      keywords: {
        primary: 'internal linking for content',
        secondary: ['frontmatter link graph', 'contentbit links'],
      },
      linksTo: ['docs/guides/agents', 'docs/guides/doctor'],
    },
    'content/docs/guides/markdown.mdx': {
      type: 'docs-guide',
      key: 'markdown',
      slug: 'docs/guides/markdown',
      intent: 'Markdown integration',
      keywords: {
        primary: 'plug in Markdown renderer',
        secondary: ['react-markdown contentbit', 'remark content blocks'],
      },
      linksTo: ['docs/guides/renderers', 'docs/concepts/syntax'],
    },
    'content/docs/guides/custom-blocks.mdx': {
      type: 'docs-guide',
      key: 'custom-blocks',
      slug: 'docs/guides/custom-blocks',
      intent: 'custom schema authoring',
      keywords: {
        primary: 'custom Markdown blocks',
        secondary: ['defineBlock', 'content block schema'],
      },
      linksTo: ['docs/reference/blocks', 'docs/guides/agents'],
    },
    'content/docs/guides/astro.mdx': {
      type: 'docs-guide',
      key: 'astro',
      slug: 'docs/guides/astro',
      intent: 'Astro integration',
      keywords: {
        primary: 'Astro content blocks',
        secondary: ['Astro Markdown renderer', 'structured Markdown Astro'],
      },
      linksTo: ['docs/guides/renderers', 'docs/guides/markdown'],
    },
    'content/docs/guides/stats.mdx': {
      type: 'docs-guide',
      key: 'stats',
      slug: 'docs/guides/stats',
      intent: 'content analytics',
      keywords: {
        primary: 'Markdown document stats',
        secondary: ['content auditing JSON', 'analyze Markdown documents'],
      },
      linksTo: ['docs/guides/doctor', 'docs/guides/agents'],
    },
    'content/docs/guides/seo-briefs.mdx': {
      type: 'docs-guide',
      key: 'seo-briefs',
      slug: 'docs/guides/seo-briefs',
      title: 'SEO briefs and contracts',
      intent: 'programmatic SEO structure',
      keywords: {
        primary: 'programmatic SEO briefs',
        secondary: ['SEO content contracts', 'agent SEO brief'],
      },
      linksTo: ['docs/guides/doctor', 'docs/guides/agents', 'docs/guides/internal-linking'],
    },
    'content/docs/concepts/llm-authoring.mdx': {
      type: 'docs-concept',
      key: 'llm-authoring',
      slug: 'docs/concepts/llm-authoring',
      intent: 'concept education',
      keywords: {
        primary: 'LLM authoring workflow',
        secondary: ['generated content validation', 'schema generated prompts'],
      },
      linksTo: ['docs/guides/agents', 'docs/guides/doctor'],
    },
    'content/docs/concepts/syntax.mdx': {
      type: 'docs-concept',
      key: 'syntax',
      slug: 'docs/concepts/syntax',
      intent: 'syntax reference',
      keywords: {
        primary: 'Markdown directive block syntax',
        secondary: ['content block fences', 'directive props'],
      },
      linksTo: ['docs/reference/blocks', 'docs/guides/custom-blocks'],
    },
    'content/docs/concepts/why-not-mdx.mdx': {
      type: 'docs-concept',
      key: 'why-not-mdx',
      slug: 'docs/concepts/why-not-mdx',
      intent: 'positioning',
      keywords: {
        primary: 'why not MDX',
        secondary: ['MDX alternative', 'structured Markdown'],
      },
      linksTo: ['docs/concepts/syntax', 'docs/guides/renderers'],
    },
    'content/docs/reference/blocks.mdx': {
      type: 'docs-reference',
      key: 'block-reference',
      slug: 'docs/reference/blocks',
      intent: 'block reference',
      keywords: {
        primary: 'contentbit block reference',
        secondary: ['Markdown block schemas', 'built-in content blocks'],
      },
      linksTo: ['docs/guides/custom-blocks', 'docs/concepts/syntax'],
    },
    'content/docs/changelog.mdx': {
      type: 'changelog',
      key: 'changelog',
      slug: 'docs/changelog',
      intent: 'release discovery',
      keywords: {
        primary: 'contentbit changelog',
        secondary: ['contentbit releases', 'Content Blocks updates'],
      },
      linksTo: ['contentbit-0-3-0', 'docs/guides/doctor', 'docs/guides/studio'],
    },
    'content/docs/release-checklist.mdx': {
      type: 'ops-doc',
      key: 'release-checklist',
      slug: 'docs/release-checklist',
      intent: 'internal release operations',
    },
    'llm-markdown-that-cannot-break': {
      type: 'blog-post',
      key: 'llm-markdown-that-cannot-break',
      intent: 'thought leadership',
    },
    'contentbit-0-2-0': {
      type: 'blog-post',
      key: 'contentbit-0-2-0',
      intent: 'release announcement',
    },
    'contentbit-0-3-0': {
      type: 'blog-post',
      key: 'contentbit-0-3-0',
      intent: 'release announcement',
    },
  },
})
