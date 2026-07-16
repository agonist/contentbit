import type { ReactNode } from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { GlyphField } from '../lib/glyphs'
import { C, MONO } from '../lib/theme'
import { MICRO_EPISODES, type MicroEpisodeId } from './episodes'

export type MicroVideoProps = {
  episodeId: MicroEpisodeId
}

function appear(frame: number, at: number, duration = 12) {
  return interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function MicroPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: 920,
        minHeight: 410,
        background: 'rgba(17,17,17,0.97)',
        border: `1px solid ${C.border}`,
        boxShadow: '0 28px 90px rgba(0,0,0,0.62)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '17px 22px',
          borderBottom: `1px solid ${C.border}`,
          color: C.muted,
          fontFamily: MONO,
          fontSize: 21,
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginRight: 9 }}>
          {[C.red, C.amber, C.emerald].map((color) => (
            <div
              key={color}
              style={{ width: 12, height: 12, borderRadius: 99, background: color }}
            />
          ))}
        </div>
        {title}
      </div>
      <div style={{ padding: '28px 30px' }}>{children}</div>
    </div>
  )
}

function TerminalRow({
  at,
  label,
  value,
  tone = 'normal',
}: {
  at: number
  label?: string
  value: string
  tone?: 'normal' | 'success' | 'error' | 'muted'
}) {
  const frame = useCurrentFrame()
  const opacity = appear(frame, at, 8)
  const color =
    tone === 'success' ? C.emerald : tone === 'error' ? C.red : tone === 'muted' ? C.muted : C.fg
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: label ? '210px 1fr' : '1fr',
        gap: 18,
        marginBottom: 13,
        color,
        fontFamily: MONO,
        fontSize: 22,
        lineHeight: 1.35,
        opacity,
        transform: `translateY(${(1 - opacity) * 8}px)`,
      }}
    >
      {label ? <span style={{ color: C.dim }}>{label}</span> : null}
      <span>{value}</span>
    </div>
  )
}

function ControlLayerDemo() {
  const frame = useCurrentFrame()
  const count = Math.round(interpolate(frame, [60, 126], [0, 100], { extrapolateRight: 'clamp' }))
  const warnings = [
    ['missing section', 116],
    ['invented block', 132],
    ['broken link', 148],
  ] as const
  return (
    <MicroPanel title="agent-run.log">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: C.dim, fontFamily: MONO, fontSize: 19 }}>PAGES GENERATED</div>
          <div style={{ color: C.fg, fontFamily: MONO, fontSize: 100, fontWeight: 700 }}>
            {count}
          </div>
        </div>
        <div style={{ width: 470 }}>
          {warnings.map(([label, at], index) => {
            const opacity = appear(frame, at, 8)
            return (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 15,
                  border: `1px solid ${C.border}`,
                  padding: '15px 18px',
                  marginBottom: 12,
                  background: 'rgba(248,113,113,0.05)',
                  opacity,
                  transform: `translateX(${(1 - opacity) * 24}px)`,
                }}
              >
                <span style={{ color: C.red, fontFamily: MONO, fontSize: 23 }}>×</span>
                <span style={{ color: C.muted, fontFamily: MONO, fontSize: 21 }}>{label}</span>
                <span style={{ marginLeft: 'auto', color: C.dim, fontFamily: MONO, fontSize: 17 }}>
                  page-{String((index + 1) * 17).padStart(3, '0')}.md
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <TerminalRow
        at={174}
        tone="success"
        value="contentbit: contract loaded · checking every page"
      />
    </MicroPanel>
  )
}

function BriefDemo() {
  return (
    <MicroPanel title="terminal — contentbit brief">
      <TerminalRow at={58} value="$ contentbit brief semrush-alternatives" />
      <div style={{ height: 15 }} />
      <TerminalRow at={82} label="intent" value="commercial comparison" />
      <TerminalRow at={98} label="sections" value="Overview · Comparison · FAQ" />
      <TerminalRow at={114} label="blocks" value="comparison (required) · faq" />
      <TerminalRow at={130} label="linksTo" value="seo-tools-comparison · keyword-research" />
      <TerminalRow at={152} tone="success" value="✓ 7 acceptance checks ready before drafting" />
    </MicroPanel>
  )
}

function DoctorDemo() {
  const frame = useCurrentFrame()
  const fixed = frame >= 154
  const pulse = spring({ frame: frame - 176, fps: 30, config: { damping: 14, stiffness: 150 } })
  return (
    <MicroPanel title="article.md ↔ contentbit doctor">
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.25fr', gap: 28 }}>
        <div
          style={{
            border: `1px solid ${fixed ? C.emeraldDim : C.border}`,
            padding: 20,
            fontFamily: MONO,
            fontSize: 21,
            lineHeight: 1.65,
          }}
        >
          <div style={{ color: C.fg }}>{':::comparison'}</div>
          <div
            style={{
              color: fixed ? C.muted : C.red,
              textDecoration: fixed ? 'none' : 'underline wavy',
              textUnderlineOffset: 7,
            }}
          >
            {fixed ? '- Price | Free | $12/mo' : '- Price | Free'}
          </div>
          <div style={{ color: C.fg }}>:::</div>
        </div>
        <div style={{ paddingTop: 3 }}>
          {!fixed ? (
            <>
              <TerminalRow at={76} tone="error" value="article.md:2:1 CB_ROW_COLUMNS" />
              <TerminalRow at={94} tone="muted" value="Expected 3 columns. Found 2." />
              <TerminalRow at={112} tone="muted" value="hint: label | left | right" />
            </>
          ) : (
            <div
              style={{
                color: C.emerald,
                fontFamily: MONO,
                fontSize: 29,
                fontWeight: 700,
                paddingTop: 35,
                opacity: Math.max(0, pulse),
                transform: `scale(${0.93 + Math.max(0, pulse) * 0.07})`,
                transformOrigin: 'left center',
              }}
            >
              ✓ 0 errors · publish clean
            </div>
          )}
        </div>
      </div>
      <TerminalRow at={178} tone="success" value="diagnostic → repair → validate" />
    </MicroPanel>
  )
}

function GraphNode({
  x,
  y,
  label,
  tone = 'normal',
}: {
  x: number
  y: number
  label: string
  tone?: 'normal' | 'active' | 'error'
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 220,
        padding: '16px 12px',
        border: `1px solid ${tone === 'error' ? C.red : tone === 'active' ? C.emerald : C.border}`,
        background: C.panel,
        color: tone === 'error' ? C.red : tone === 'active' ? C.emerald : C.muted,
        fontFamily: MONO,
        fontSize: 18,
        textAlign: 'center',
      }}
    >
      {label}
    </div>
  )
}

function GraphEdge({
  x,
  y,
  width,
  rotate,
  color,
}: {
  x: number
  y: number
  width: number
  rotate: number
  color: string
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height: 2,
        background: color,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: 'left center',
      }}
    />
  )
}

function LinkGraphDemo() {
  const frame = useCurrentFrame()
  const broken = frame < 150
  const opacity = appear(frame, 66, 12)
  return (
    <MicroPanel title=".contentbit/link-index.json">
      <div style={{ position: 'relative', height: 285, opacity }}>
        <GraphEdge x={205} y={143} width={270} rotate={-22} color={broken ? C.red : C.emeraldDim} />
        <GraphEdge x={205} y={143} width={270} rotate={22} color={broken ? C.red : C.emeraldDim} />
        <GraphEdge x={425} y={80} width={210} rotate={0} color={C.emeraldDim} />
        <GraphNode x={0} y={108} label="seo-tools" />
        <GraphNode
          x={350}
          y={0}
          label={broken ? 'semrush-old' : 'semrush-alternatives'}
          tone={broken ? 'error' : 'active'}
        />
        <GraphNode x={350} y={205} label="keyword-research" />
        <GraphNode x={650} y={0} label="comparison-guide" />
      </div>
      {broken ? (
        <TerminalRow at={104} tone="error" value="CB_LINK_UNRESOLVED · semrush-old" />
      ) : (
        <TerminalRow at={152} tone="success" value="✓ alias resolved · 3 references repaired" />
      )}
    </MicroPanel>
  )
}

function AdoptDemo() {
  return (
    <MicroPanel title="terminal — read-only adoption report">
      <TerminalRow at={55} value={'$ contentbit adopt "content/**/*.{md,mdx}" --dry-run'} />
      <div style={{ height: 13 }} />
      <TerminalRow at={84} label="scanned" value="248 Markdown files" />
      <TerminalRow at={100} label="inferred" value="4 page families" />
      <TerminalRow at={116} label="found" value="19 integrity gaps · 7 stale links" />
      <TerminalRow at={132} label="proposed" value="contracts for glossary · guide · comparison" />
      <div style={{ height: 12 }} />
      <TerminalRow at={158} tone="success" value="✓ dry run complete · 0 files changed" />
    </MicroPanel>
  )
}

function ContractCard({ at, label, value }: { at: number; label: string; value: string }) {
  const frame = useCurrentFrame()
  const opacity = appear(frame, at, 10)
  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        background: C.panel,
        padding: '20px 22px',
        opacity,
        transform: `translateY(${(1 - opacity) * 15}px)`,
      }}
    >
      <div style={{ color: C.emerald, fontFamily: MONO, fontSize: 17, letterSpacing: 2 }}>
        {label}
      </div>
      <div style={{ color: C.fg, fontFamily: MONO, fontSize: 24, marginTop: 9 }}>{value}</div>
    </div>
  )
}

function OneContractDemo() {
  const frame = useCurrentFrame()
  const contractOpacity = appear(frame, 58, 10)
  return (
    <MicroPanel title="contentbit.seo.config.ts">
      <div
        style={{
          border: `1px solid ${C.emerald}`,
          padding: '18px 24px',
          margin: '0 auto 22px',
          width: 500,
          color: C.emerald,
          fontFamily: MONO,
          fontSize: 25,
          fontWeight: 700,
          textAlign: 'center',
          opacity: contractOpacity,
        }}
      >
        PAGE FAMILY CONTRACT
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <ContractCard at={84} label="WRITER" value="page brief" />
        <ContractCard at={100} label="AGENT" value="live rules" />
        <ContractCard at={116} label="REVIEWER" value="Studio" />
        <ContractCard at={132} label="CI" value="publishing gate" />
      </div>
    </MicroPanel>
  )
}

function Demo({ episodeId }: MicroVideoProps) {
  switch (episodeId) {
    case 'ControlLayer':
      return <ControlLayerDemo />
    case 'BriefBeforeDraft':
      return <BriefDemo />
    case 'DoctorRepair':
      return <DoctorDemo />
    case 'LinkGraph':
      return <LinkGraphDemo />
    case 'AdoptDryRun':
      return <AdoptDemo />
    case 'OneContract':
      return <OneContractDemo />
  }
}

export function MicroVideo({ episodeId }: MicroVideoProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const episode = MICRO_EPISODES[episodeId]
  const hook = spring({ frame: frame - 8, fps, config: { damping: 16, stiffness: 130 } })
  const demo = appear(frame, 46, 14)
  const payoff = appear(frame, 230, 14)
  const brand = appear(frame, 278, 12)
  const accentColor = episodeId === 'DoctorRepair' || episodeId === 'LinkGraph' ? C.red : C.emerald

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <GlyphField opacity={0.34} peakAt={330} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 34%, rgba(16,185,129,0.08), transparent 40%), linear-gradient(180deg, rgba(10,10,10,0.15), rgba(10,10,10,0.92))',
        }}
      />

      <div style={{ position: 'relative', height: '100%' }}>
        <div
          style={{
            position: 'absolute',
            top: 68,
            left: 96,
            right: 96,
            display: 'flex',
            justifyContent: 'center',
            color: C.muted,
            fontFamily: MONO,
            fontSize: 18,
            letterSpacing: 4,
            textAlign: 'center',
          }}
        >
          <span>
            <span style={{ color: C.emerald }}>{episode.index}</span> · {episode.eyebrow}
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 150,
            right: 80,
            bottom: 250,
            left: 80,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              opacity: Math.max(0, hook),
              transform: `translateY(${(1 - Math.max(0, hook)) * 22}px)`,
            }}
          >
            <div
              style={{
                color: C.fg,
                fontFamily: MONO,
                fontSize: 56,
                fontWeight: 700,
                letterSpacing: -2,
              }}
            >
              {episode.hook}
            </div>
            <div
              style={{
                color: accentColor,
                fontFamily: MONO,
                fontSize: 56,
                fontWeight: 700,
                letterSpacing: -2,
                marginTop: 5,
              }}
            >
              {episode.accent}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 48,
              opacity: demo,
              transform: `translateY(${(1 - demo) * 20}px)`,
            }}
          >
            <Demo episodeId={episodeId} />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 96,
            right: 96,
            bottom: 148,
            color: C.fg,
            fontFamily: MONO,
            fontSize: 31,
            fontWeight: 700,
            textAlign: 'center',
            opacity: payoff,
          }}
        >
          {episode.payoff}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 96,
            right: 96,
            bottom: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 15,
            opacity: brand,
          }}
        >
          <div style={{ width: 20, height: 20, background: C.emerald }} />
          <span style={{ color: C.fg, fontFamily: MONO, fontSize: 24, fontWeight: 700 }}>
            contentbit
          </span>
          <span style={{ color: C.dim, fontFamily: MONO, fontSize: 21 }}>contentbit.dev</span>
        </div>
      </div>
    </AbsoluteFill>
  )
}
