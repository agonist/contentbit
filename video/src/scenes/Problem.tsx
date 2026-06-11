import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { GlyphField } from '../lib/glyphs'
import { C, MONO } from '../lib/theme'
import { Panel, Punch, Rise, Typed } from '../lib/ui'

/** Scene 1: fluent, confident, wrong. Action done by ~f110, holds after. */
export function Problem() {
  const frame = useCurrentFrame()
  const flash = interpolate(frame, [52, 58, 78], [0, 1, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  // Panel steps back when the punchline lands.
  const dim = interpolate(frame, [66, 78], [1, 0.45], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <AbsoluteFill style={{ background: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <GlyphField opacity={0.5} from={0} />
      <Rise at={0}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: -1,
            color: C.fg,
            marginBottom: 34,
            textAlign: 'center',
            opacity: dim,
          }}
        >
          LLMs write beautiful Markdown.
        </div>
      </Rise>
      <Rise at={4}>
        <div style={{ opacity: dim, transform: `scale(${0.97 + dim * 0.03})` }}>
          <Panel title="generated-by-your-llm.md" trafficLights>
            <div style={{ fontFamily: MONO, fontSize: 24, lineHeight: 1.7 }}>
              <div>
                <Typed
                  text="## Choosing your yeast"
                  start={8}
                  cps={44}
                  color={C.fg}
                  cursor={false}
                />
              </div>
              <div>
                <Typed
                  text="Fresh yeast has romance. Instant has reliability."
                  start={18}
                  cps={44}
                  color={C.muted}
                  cursor={false}
                />
              </div>
              <div style={{ position: 'relative', marginTop: 8 }}>
                <span
                  style={{
                    position: 'absolute',
                    inset: '-4px -10px',
                    background: `rgba(248,113,113,${flash * 0.14})`,
                    border: `1px solid rgba(248,113,113,${flash})`,
                  }}
                />
                <Typed text='<Callout2 variant="warn">' start={38} cps={40} color={C.red} />
              </div>
            </div>
          </Panel>
        </div>
      </Rise>
      <div style={{ marginTop: 44, minHeight: 90 }}>
        <Punch at={68} size={72}>
          It looks right. <span style={{ color: C.red }}>It ships broken.</span>
        </Punch>
      </div>
    </AbsoluteFill>
  )
}
