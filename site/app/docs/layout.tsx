import type { CSSProperties, ReactNode } from 'react'

import { SiteHeader } from '@/components/site-header'
import { source } from '@/lib/source'
import { DocsLayout } from 'fumadocs-ui/layouts/docs'

/*
 * The global site navbar stays on top; the docs layout only adds the page
 * tree sidebar and TOC. `--fd-banner-height` tells fumadocs how much sticky
 * space sits above it, so the sidebar and mobile docs header offset below
 * the navbar. Duplicated chrome (logo, links, GitHub, theme toggle) lives
 * in the navbar — the sidebar keeps just search and the tree.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <DocsLayout
        tree={source.getPageTree()}
        containerProps={{
          style: { '--fd-banner-height': '3.5rem' } as CSSProperties,
        }}
        themeSwitch={{ enabled: false }}
      >
        {children}
      </DocsLayout>
    </>
  )
}
