import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ThemeProvider } from '@/components/theme-provider'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'

import './globals.css'

export const metadata: Metadata = {
  title: 'Content Blocks — structured Markdown components without framework lock-in',
  description:
    'Write Markdown with validated, structured component blocks. Render it anywhere — React, static HTML, or plain Markdown. Built for content written by humans, CMSes, and LLMs.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
