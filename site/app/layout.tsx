import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { RootProvider } from 'fumadocs-ui/provider/next'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Content Blocks — structured Markdown components without framework lock-in',
    template: '%s · Content Blocks',
  },
  description:
    'Write Markdown with validated, structured component blocks. Render it anywhere — React, static HTML, or plain Markdown. Built for content written by humans, CMSes, and LLMs.',
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
