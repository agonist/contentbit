import { interpolate, useCurrentFrame } from 'remotion'
import { C, MONO } from './theme'

const ENTROPY = ':|{}-=".a~e*r+t%n?o/s<i>'

const PALETTE = ['#10b981', '#38bdf8', '#fbbf24', '#fb7185', '#a78bfa']

function hash(x: number, y: number, t: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + t * 74.7) * 43758.5453
  return n - Math.floor(n)
}

/**
 * Deterministic glyph field. `from` is the scene's global start frame, so the
 * field builds in density and presence across the whole intro (0 → 700),
 * peaking when the wordmark lands and the beat drops.
 */
export function GlyphField({
  opacity = 0.5,
  from = 0,
  peakAt = 700,
}: {
  opacity?: number
  from?: number
  peakAt?: number
}) {
  const frame = useCurrentFrame()
  const global = from + frame
  const ramp = interpolate(global, [0, peakAt], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const density = 0.22 + ramp * 0.3
  const tick = Math.floor(frame / Math.max(4, 10 - ramp * 6))
  const cols = 40
  const rows = 23
  const cells: React.ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (hash(c, r, 0) > density) continue
      const ch = ENTROPY[Math.floor(hash(c, r, tick) * ENTROPY.length)]
      const colored = ramp > 0.45 && hash(c, r, 7) < (ramp - 0.45) * 0.3
      const color = PALETTE[Math.floor(hash(c, r, 13) * PALETTE.length)]
      cells.push(
        <div
          key={`${c}-${r}`}
          style={{
            position: 'absolute',
            left: c * 48 + 24,
            top: r * 48 + 12,
            color: colored ? color : C.border,
            fontFamily: MONO,
            fontSize: 20,
          }}
        >
          {ch}
        </div>,
      )
    }
  }
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: opacity * (0.7 + ramp * 0.75) }}>
      {cells}
    </div>
  )
}
