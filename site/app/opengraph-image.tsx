import { Grid } from '@/components/og/grid'
import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'
export const alt = 'contentbit — structured Markdown components without framework lock-in'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <Grid
        title="Structured Markdown components"
        description="Validated blocks in plain Markdown. Rendered anywhere. Built for content written by humans, CMSes, and LLMs."
        brand="contentbit"
        accent="#10b981"
      />
    ),
    size,
  )
}
