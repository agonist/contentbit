import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { GlyphField } from '../lib/glyphs'
import { C, MONO } from '../lib/theme'
import { Eyebrow, Panel, Punch, Rise } from '../lib/ui'

/** Scene 3: the safety net — diagnostic, repair, green. */
export function Loop() {
  const frame = useCurrentFrame()
  // Phases: broken source (0+), diagnostic (14+), fix swaps in (44+), green stamp (62+)
  const fixed = frame >= 44
  const stamp = interpolate(frame, [62, 72], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <AbsoluteFill style={{ background: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <GlyphField opacity={0.5} from={330} />
      <div style={{ marginBottom: 30 }}>
        <Rise at={0}>
          <Eyebrow index="02">Validated before it ever renders</Eyebrow>
        </Rise>
      </div>
      <Rise at={4}>
        <div style={{ display: 'flex', gap: 24 }}>
          <Panel title="article.md" width={620}>
            <div style={{ fontFamily: MONO, fontSize: 23, lineHeight: 1.8 }}>
              <div style={{ color: C.fg }}>{':::comparison{left="Basic"}'}</div>
              <div
                style={{
                  color: fixed ? C.muted : C.red,
                  textDecoration: fixed ? 'none' : 'underline wavy',
                  textUnderlineOffset: 8,
                }}
              >
                {fixed ? '- Price | Free | $12/mo' : '- Price | Free'}
              </div>
              <div style={{ color: C.fg }}>:::</div>
            </div>
          </Panel>
          <Panel title="contentbit validate" width={760}>
            <div style={{ fontFamily: MONO, fontSize: 21, lineHeight: 1.7 }}>
              {frame >= 14 ? (
                <>
                  <div style={{ color: C.red }}>article.md:2:1 error CB_ROW_COLUMNS</div>
                  <div style={{ color: C.muted }}>
                    rows require 3 columns (label | left | right). Found 2.
                  </div>
                  <div style={{ color: C.muted }}>hint: Format: - label | left | right</div>
                </>
              ) : (
                <div style={{ color: C.dim }}>…</div>
              )}
              <div
                style={{
                  marginTop: 22,
                  color: C.emerald,
                  fontSize: 24,
                  opacity: stamp,
                  transform: `scale(${0.9 + stamp * 0.1})`,
                  transformOrigin: 'left center',
                }}
              >
                ✓ 1 file(s): 0 errors, 0 warnings
              </div>
            </div>
          </Panel>
        </div>
      </Rise>
      <div style={{ marginTop: 44, minHeight: 90 }}>
        <Punch at={78} size={54}>
          Diagnostics a model can act on.{' '}
          <span style={{ color: C.emerald }}>It repairs itself.</span>
        </Punch>
      </div>
    </AbsoluteFill>
  )
}
