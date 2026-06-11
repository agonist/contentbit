import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { GlyphField } from '../lib/glyphs'
import { C, MONO } from '../lib/theme'
import { Panel, Punch, Rise } from '../lib/ui'
import { Typed } from '../lib/ui'

const SCAFFOLD = [
  'created: blocks/registry.ts',
  'created: blocks/components.tsx',
  'created: content/example.md',
  'created: src/routes/example.tsx',
  'created: contentbit-guide.md (LLM authoring instructions)',
]

/** Scene 2: one command. Typing done ~f40, scaffold ~f85, holds after. */
export function Command() {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <GlyphField opacity={0.5} from={185} />
      <div style={{ marginBottom: 40 }}>
        <Punch at={0} size={76}>
          <span style={{ color: C.emerald }}>One command</span> sets everything up.
        </Punch>
      </div>
      <Rise at={8}>
        <Panel title="terminal" trafficLights>
          <div style={{ fontFamily: MONO, fontSize: 27, lineHeight: 1.8 }}>
            <div>
              <span style={{ color: C.dim }}>$ </span>
              <Typed text="npx contentbit@latest init" start={8} cps={34} color={C.fg} />
            </div>
            <div style={{ marginTop: 10, fontSize: 22 }}>
              {SCAFFOLD.map((line, i) => {
                const at = 34 + i * 5
                return frame >= at ? (
                  <div key={line} style={{ color: C.muted }}>
                    <span style={{ color: C.emerald }}>+</span> {line}
                  </div>
                ) : null
              })}
            </div>
          </div>
        </Panel>
      </Rise>
    </AbsoluteFill>
  )
}
