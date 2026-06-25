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
    default: 'contentbit — structured Markdown components for LLM-written content',
    template: '%s · contentbit',
  },
  description:
    'Give LLMs validated, structured Markdown blocks. Render LLM output anywhere: React, Astro, or plain Markdown.',
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
