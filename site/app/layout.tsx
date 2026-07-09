import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { SITE_URL } from '@/lib/site'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { RootProvider } from 'fumadocs-ui/provider/next'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'contentbit: programmatic SEO content infrastructure',
    template: '%s · contentbit',
  },
  description:
    'Define reusable page contracts, give agents a brief for every page, and validate content structure and internal links before publishing.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        {/* RootProvider bundles next-themes (class attribute), so the site's
            ThemeToggle keeps working; static search suits the static export. */}
        <RootProvider search={{ options: { type: 'static' } }}>{children}</RootProvider>
      </body>
    </html>
  )
}
