import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { C, MONO } from '../lib/theme'

/*
 * The rave outro. The end card holds; everything else rides the beat.
 * Tuned to the track: 230 BPM at 30fps, one beat = 7.826 frames.
 * Escalation tiers add glyph density and pump strength every 16 bars.
 * No information is shared here. That is the point.
 */

const BPM = 230
const BEAT = (60 / BPM) * 30
const BAR = BEAT * 4

const ENTROPY = ':|{}-=".a~e*r+t%n?o/s<i>:::'

// Rave palette: the callout family. Green is not alone anymore.
const PALETTE = ['#10b981', '#38bdf8', '#fbbf24', '#fb7185', '#a78bfa']

function hash(x: number, y: number, t: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + t * 74.7) * 43758.5453
  return n - Math.floor(n)
}

/** 0..1 sawtooth that hits 1 on every beat then decays. */
function beatPulse(frame: number, every = BEAT): number {
  const pos = frame % every
  return Math.max(0, 1 - pos / (every * 0.7))
}

function RaveGlyphs({ frame, tier }: { frame: number; tier: number }) {
  const tick = Math.floor(frame / 3) // mutate fast
  const density = Math.min(0.25 + tier * 0.12, 0.8)
  const pulse = beatPulse(frame)
  const downbeat = frame % BAR < BEAT ? beatPulse(frame, BAR) : 0
  const cells: React.ReactNode[] = []
  const cols = 40
  const rows = 23
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = hash(c, r, 0)
      if (h > density) continue
      const ch = ENTROPY[Math.floor(hash(c, r, tick) * ENTROPY.length)]
      const colored = hash(c, r, 7) < 0.14 + tier * 0.04 + downbeat * 0.3
      const color = PALETTE[Math.floor(hash(c, r, 13) * PALETTE.length)]
      cells.push(
        <div
          key={`${c}-${r}`}
          style={{
            position: 'absolute',
            left: c * 48 + 24,
            top: r * 48 + 12,
            color: colored ? color : C.border,
            opacity: colored ? 0.35 + pulse * 0.65 : 0.5 + pulse * 0.3,
            fontFamily: MONO,
            fontSize: 20 + pulse * 3,
          }}
        >
          {ch}
        </div>,
      )
    }
  }
  return <div style={{ position: 'absolute', inset: 0 }}>{cells}</div>
}

export function Rave() {
  // This sequence starts exactly on the drop: beat zero is frame zero.
  const frame = useCurrentFrame()
  const tier = Math.floor(frame / (BAR * 16)) // escalate every 16 bars (~19s)
  // Hard slam on the drop, then per-beat blink on the wordmark.
  const slam = interpolate(frame, [0, 4], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const pump = 1 + slam * 0.06 + beatPulse(frame) * (0.012 + Math.min(tier, 6) * 0.004)
  const downbeatGlow = frame % BAR < BEAT ? beatPulse(frame, BAR) : 0
  // The whole card breathes with the beat; dots flash through the columns.
  const dots = [0, 1, 2].flatMap((col) => [0, 1].map((row) => ({ col, row })))
  const litCol = Math.floor(frame / BEAT) % 3
  const beatIndex = Math.floor(frame / BEAT)
  const blinkOn = frame % BEAT < 2.5
  const wordColor = blinkOn ? PALETTE[beatIndex % PALETTE.length] : C.fg
  return (
    <AbsoluteFill style={{ background: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <RaveGlyphs frame={frame} tier={tier} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 36,
          transform: `scale(${pump})`,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 132,
            height: 132,
            background: C.fg,
            boxShadow: `0 0 ${30 + downbeatGlow * 90}px rgba(16,185,129,${0.12 + downbeatGlow * 0.5})`,
          }}
        >
          {dots.map(({ col, row }, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 30 + col * 30,
                top: 38 + row * 32,
                width: 14,
                height: 14,
                background: col === litCol ? C.emerald : C.bg,
              }}
            />
          ))}
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 84, fontWeight: 700, color: wordColor }}>
            contentbit
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 30,
              color: C.muted,
              marginTop: 4,
              opacity: 0.6 + beatPulse(frame) * 0.4,
            }}
          >
            contentbit.dev · npx contentbit@latest init
          </div>
        </div>
      </div>
      {/* corner ticks, breathing opposite the logo */}
      {['12%', '88%'].flatMap((x) =>
        ['14%', '86%'].map((y) => (
          <div
            key={`${x}-${y}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              fontFamily: MONO,
              fontSize: 28,
              color: C.dim,
              opacity: 0.4 + beatPulse(frame + BEAT / 2) * 0.6,
            }}
          >
            +
          </div>
        )),
      )}
      {/* impact flash on the drop */}
      <AbsoluteFill
        style={{
          background: C.fg,
          opacity: slam * 0.22,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  )
}
