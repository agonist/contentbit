export function ContentGraphDemo() {
  return (
    <div className="bg-card overflow-hidden border shadow-sm">
      <div className="text-muted-foreground flex items-center border-b px-4 py-3 font-mono text-[11px]">
        content graph
        <span className="ml-auto text-emerald-600 dark:text-emerald-400">12 links resolved</span>
      </div>
      <svg
        viewBox="0 0 760 390"
        className="bg-muted/20 h-auto w-full"
        role="img"
        aria-labelledby="content-graph-title content-graph-description"
      >
        <title id="content-graph-title">Internal linking graph for an SEO page family</title>
        <desc id="content-graph-description">
          A comparison hub connects to product alternatives, guides, and glossary pages with
          resolved outgoing links and backlinks.
        </desc>
        <defs>
          <pattern id="graph-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
          </pattern>
          <marker
            id="graph-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-emerald-500" />
          </marker>
        </defs>
        <rect width="760" height="390" fill="url(#graph-grid)" />

        <g
          fill="none"
          className="stroke-emerald-500/65"
          strokeWidth="1.5"
          markerEnd="url(#graph-arrow)"
        >
          <path d="M 308 186 C 250 145, 220 112, 190 89" />
          <path d="M 452 186 C 520 144, 558 112, 588 89" />
          <path d="M 308 221 C 252 258, 222 286, 190 310" />
          <path d="M 452 221 C 516 258, 550 285, 580 310" />
        </g>
        <g fill="none" className="stroke-foreground/20" strokeDasharray="5 7">
          <path d="M 190 112 C 278 145, 488 145, 574 112" />
          <path d="M 190 288 C 275 255, 487 255, 580 288" />
        </g>

        <GraphNode x={54} y={54} width={170} eyebrow="alternative" title="Notion alternatives" />
        <GraphNode x={536} y={54} width={170} eyebrow="alternative" title="Semrush alternatives" />
        <GraphNode x={54} y={282} width={170} eyebrow="guide" title="Choose an SEO tool" />
        <GraphNode x={536} y={282} width={170} eyebrow="glossary" title="SEO content audit" />

        <g>
          <rect
            x="292"
            y="164"
            width="176"
            height="78"
            className="fill-foreground stroke-foreground"
          />
          <text
            x="312"
            y="189"
            className="fill-background font-mono text-[10px] tracking-[0.16em] uppercase"
          >
            comparison hub
          </text>
          <text x="312" y="216" className="fill-background text-sm font-medium">
            Best SEO tools
          </text>
        </g>

        <g className="fill-muted-foreground font-mono text-[9px] tracking-widest uppercase">
          <text x="284" y="125">
            backlinks
          </text>
          <text x="475" y="265">
            required link
          </text>
        </g>
      </svg>
      <div className="text-muted-foreground grid grid-cols-3 border-t font-mono text-[10px]">
        <div className="px-4 py-3 text-center">stable keys</div>
        <div className="border-x px-4 py-3 text-center">locale-aware</div>
        <div className="px-4 py-3 text-center">alias-safe</div>
      </div>
    </div>
  )
}

function GraphNode({
  x,
  y,
  width,
  eyebrow,
  title,
}: {
  x: number
  y: number
  width: number
  eyebrow: string
  title: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={width} height="54" className="fill-background stroke-border" />
      <text
        x={x + 14}
        y={y + 20}
        className="fill-muted-foreground font-mono text-[9px] tracking-[0.14em] uppercase"
      >
        {eyebrow}
      </text>
      <text x={x + 14} y={y + 40} className="fill-foreground text-[12px] font-medium">
        {title}
      </text>
    </g>
  )
}
