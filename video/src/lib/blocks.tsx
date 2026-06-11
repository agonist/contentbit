import type { BlockComponent, BlockComponentProps } from '@contentbit/react'
import type { ReactNode } from 'react'
import { useCurrentFrame, interpolate } from 'remotion'
import { C, MONO } from './theme'

/*
 * The payoff scene renders a real validated document through @contentbit/react.
 * These are custom block components (the documented extension point), styled
 * inline for the video and animated off the Remotion frame clock.
 */

// Scene-local entrance offsets, keyed by block name.
export const BLOCK_DELAYS: Record<string, number> = {
  'key-metrics': 16,
  callout: 32,
  steps: 48,
}

function useEntrance(name: string, extra = 0): React.CSSProperties {
  const frame = useCurrentFrame()
  const at = (BLOCK_DELAYS[name] ?? 0) + extra
  const t = interpolate(frame, [at, at + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const ease = 1 - (1 - t) ** 3
  return { opacity: ease, transform: `translateY(${(1 - ease) * 24}px)` }
}

/** Minimal markdown: only **bold**, which is all the scene's content uses. */
export function renderMd(md: string): ReactNode {
  return md.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') ? (
      <strong key={i} style={{ color: C.fg }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function KeyMetrics({ node }: BlockComponentProps) {
  const data = node.data as { rows: Array<{ value: string; label: string }> }
  const style = useEntrance('key-metrics')
  return (
    <div style={{ ...style, display: 'flex', gap: 16, marginBottom: 24 }}>
      {data.rows.map((row, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            border: `1px solid ${C.border}`,
            background: C.panel,
            padding: '20px 22px 16px',
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 700, color: C.fg, fontFamily: MONO }}>
            {row.value}
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: MONO,
              fontSize: 16,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: C.muted,
            }}
          >
            {row.label}
          </div>
        </div>
      ))}
    </div>
  )
}

function Callout({ node, ctx: _ctx }: BlockComponentProps) {
  const data = node.data as { markdown: string }
  const title = node.props.title as string | undefined
  const style = useEntrance('callout')
  return (
    <div style={{ ...style, border: `1px solid ${C.emeraldDim}`, marginBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 20px',
          borderBottom: `1px solid ${C.emeraldDim}`,
          background: 'rgba(16,185,129,0.08)',
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 17,
            fontWeight: 700,
            color: C.emerald,
            letterSpacing: 2,
          }}
        >
          TIP
        </span>
        {title ? (
          <span style={{ fontSize: 21, fontWeight: 600, color: C.fg, fontFamily: MONO }}>
            {title}
          </span>
        ) : null}
      </div>
      <div
        style={{
          padding: '16px 20px',
          fontSize: 21,
          lineHeight: 1.5,
          color: C.muted,
          fontFamily: MONO,
        }}
      >
        {renderMd(data.markdown)}
      </div>
    </div>
  )
}

function Steps({ node }: BlockComponentProps) {
  const data = node.data as { items: Array<{ text: string }> }
  const frame = useCurrentFrame()
  const style = useEntrance('steps')
  return (
    <div style={style}>
      {data.items.map((item, i) => {
        const at = (BLOCK_DELAYS.steps ?? 0) + 8 + i * 8
        const t = interpolate(frame, [at, at + 10], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 18,
              alignItems: 'flex-start',
              opacity: t,
              paddingBottom: i < data.items.length - 1 ? 18 : 0,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 99,
                border: `1px solid ${C.border}`,
                background: C.panel,
                color: C.fg,
                fontFamily: MONO,
                fontSize: 18,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: 21, lineHeight: '38px', color: C.muted, fontFamily: MONO }}>
              {renderMd(item.text)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const videoComponents: Record<string, BlockComponent> = {
  'key-metrics': KeyMetrics,
  callout: Callout,
  steps: Steps,
}
