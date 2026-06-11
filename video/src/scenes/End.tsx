import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { GlyphField } from '../lib/glyphs'
import { C, MONO } from '../lib/theme'

/** Scene 5: end card — the ::: mark as geometry, then the wordmark. */
export function End() {
  const frame = useCurrentFrame()
  const dots = [0, 1, 2].flatMap((col) => [0, 1].map((row) => ({ col, row })))
  const wordmark = interpolate(frame, [26, 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <AbsoluteFill style={{ background: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <GlyphField opacity={0.5} from={700} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <div style={{ position: 'relative', width: 132, height: 132, background: C.fg }}>
          {dots.map(({ col, row }, i) => {
            const at = 4 + i * 3
            const t = interpolate(frame, [at, at + 6], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 30 + col * 30,
                  top: 38 + row * 32,
                  width: 14,
                  height: 14,
                  background: C.bg,
                  opacity: t,
                  transform: `scale(${t})`,
                }}
              />
            )
          })}
        </div>
        <div style={{ opacity: wordmark, transform: `translateX(${(1 - wordmark) * -14}px)` }}>
          <div style={{ fontFamily: MONO, fontSize: 84, fontWeight: 700, color: C.fg }}>
            contentbit
          </div>
          <div style={{ fontFamily: MONO, fontSize: 30, color: C.muted, marginTop: 4 }}>
            contentbit.dev · npx contentbit@latest init
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}
