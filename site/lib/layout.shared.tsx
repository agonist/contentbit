import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

import { GITHUB_URL } from '@/lib/site'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center font-mono text-xs font-bold">
            :::
          </span>
          content-blocks
        </span>
      ),
    },
    githubUrl: GITHUB_URL,
    links: [
      { text: 'Blocks', url: '/blocks' },
      { text: 'Example', url: '/example' },
      { text: 'Playground', url: '/playground' },
    ],
  }
}
