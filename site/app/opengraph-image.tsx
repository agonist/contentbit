import { Grid } from '@/components/og/grid'
import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'
export const alt = 'contentbit: programmatic SEO content infrastructure'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <Grid
      title="Build programmatic SEO pages that stay consistent."
      description="Page contracts for planning. Agent briefs for writing. Content and link checks before publishing."
      brand="contentbit"
      accent="#10b981"
    />,
    size,
  )
}
