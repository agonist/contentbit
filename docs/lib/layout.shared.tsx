import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Content Blocks',
    },
    links: [
      {
        text: 'Playground',
        url: 'https://site-production-0c27.up.railway.app/playground',
      },
    ],
  }
}
