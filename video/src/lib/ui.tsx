import type { ReactNode } from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { C, MONO } from './theme'

/** Sharp-cornered terminal/panel chrome matching the site aesthetic. */
export function Panel({
  title,
  children,
  width = 1100,
  trafficLights = false,
}: {
  title: string
  children: ReactNode
  width?: number
  trafficLights?: boolean
}) {
  return (
    <div
      style={{
        width,
        backgroundColor: C.panel,
        border: `1px solid ${C.border}`,
        boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: `1px solid ${C.border}`,
          padding: '14px 20px',
          color: C.muted,
          fontFamily: MONO,
          fontSize: 20,
        }}
      >
        {trafficLights ? (
          <div style={{ display: 'flex', gap: 8, marginRight: 8 }}>
            {['#f87171', '#fbbf24', '#34d399'].map((c) => (
              <div
                key={c}
                style={{ width: 12, height: 12, borderRadius: 99, background: c, opacity: 0.8 }}
              />
            ))}
          </div>
        ) : null}
        {title}
      </div>
      <div style={{ padding: 28 }}>{children}</div>
    </div>
  )
}

/** Frame-driven typewriter. Returns the visible slice plus a block cursor. */
export function Typed({
  text,
  start,
  cps = 30,
  color = C.fg,
  cursor = true,
}: {
  text: string
  start: number
  cps?: number
  color?: string
  cursor?: boolean
}) {
  const frame = useCurrentFrame()
  const chars = Math.max(0, Math.floor(((frame - start) * cps) / 30))
  const shown = text.slice(0, chars)
  const done = chars >= text.length
  const blink = Math.floor(frame / 16) % 2 === 0
  return (
    <span style={{ color, fontFamily: MONO }}>
      {shown}
      {cursor && (!done || blink) && frame >= start ? <span style={{ color: C.fg }}>▍</span> : null}
    </span>
  )
}

/** Fade+rise entrance, frame-driven. */
export function Rise({
  at,
  children,
  duration = 12,
  y = 18,
}: {
  at: number
  children: ReactNode
  duration?: number
  y?: number
}) {
  const frame = useCurrentFrame()
  const t = interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const ease = 1 - (1 - t) ** 3
  return (
    <div style={{ opacity: ease, transform: `translateY(${(1 - ease) * y}px)` }}>{children}</div>
  )
}

/** Big takeaway line. Lands hard, stays put. */
export function Punch({
  at,
  children,
  size = 64,
  color,
}: {
  at: number
  children: ReactNode
  size?: number
  color?: string
}) {
  const frame = useCurrentFrame()
  const t = interpolate(frame, [at, at + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const ease = 1 - (1 - t) ** 3
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: -1,
        color: color ?? C.fg,
        opacity: ease,
        transform: `scale(${0.96 + ease * 0.04})`,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}

/** Mono eyebrow label, like the landing section headers. */
export function Eyebrow({ index, children }: { index: string; children: ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 6, color: C.muted }}>
      <span style={{ color: C.emerald }}>{index}</span>
      <span style={{ margin: '0 14px' }}>·</span>
      {children}
    </div>
  )
}
