export interface GridProps {
  title: string
  description: string
  brand: string
  accent?: string
}

const trimText = (value: string, max: number) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized

  const clipped = normalized.slice(0, max - 3)
  const boundary = clipped.lastIndexOf(' ')
  const end = clipped.slice(0, boundary > max * 0.6 ? boundary : clipped.length)
  return `${end.replace(/[.,;:]+$/, '')}...`
}

export const Grid = ({ title, description, brand, accent }: GridProps) => {
  const color = accent ?? '#10b981'

  return (
    <div
      style={{
        backgroundColor: '#07110d',
        backgroundImage:
          'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.04) 1px, transparent 1px), radial-gradient(circle at 74% 25%, rgba(16,185,129,0.26), transparent 30%), radial-gradient(circle at 8% 100%, rgba(226,232,240,0.13), transparent 34%)',
        backgroundSize: '64px 64px, 64px 64px, 100% 100%, 100% 100%',
        color: '#f6fff9',
        display: 'flex',
        fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.12)',
          bottom: 42,
          display: 'flex',
          left: 42,
          position: 'absolute',
          right: 42,
          top: 42,
        }}
      />
      <div
        style={{
          backgroundColor: color,
          bottom: 42,
          display: 'flex',
          position: 'absolute',
          right: 42,
          top: 42,
          width: 7,
        }}
      />

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 16,
          left: 76,
          position: 'absolute',
          top: 74,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            backgroundColor: color,
            color: '#03110c',
            display: 'flex',
            fontSize: 25,
            fontWeight: 900,
            height: 48,
            justifyContent: 'center',
            letterSpacing: '-0.07em',
            width: 48,
          }}
        >
          {':::'}
        </div>
        <div
          style={{
            color: '#ffffff',
            display: 'flex',
            fontSize: 30,
            fontWeight: 760,
            letterSpacing: '-0.03em',
          }}
        >
          {brand}
        </div>
      </div>

      <div
        style={{
          color: 'rgba(246,255,249,0.58)',
          display: 'flex',
          fontFamily: 'monospace',
          fontSize: 18,
          letterSpacing: '0.08em',
          position: 'absolute',
          right: 76,
          textTransform: 'uppercase',
          top: 88,
        }}
      >
        plan -&gt; brief -&gt; validate
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          left: 76,
          position: 'absolute',
          top: 166,
          width: 690,
        }}
      >
        <div
          style={{
            color: '#ffffff',
            display: 'flex',
            fontSize: title.length > 42 ? 70 : 82,
            fontWeight: 760,
            letterSpacing: '-0.058em',
            lineHeight: 0.96,
          }}
        >
          {trimText(title, 78)}
        </div>
        <div
          style={{
            color: 'rgba(246,255,249,0.72)',
            display: 'flex',
            fontSize: 27,
            lineHeight: 1.28,
            marginTop: 28,
            width: 620,
          }}
        >
          {trimText(description, 128)}
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'rgba(6,17,13,0.86)',
          border: '1px solid rgba(246,255,249,0.14)',
          display: 'flex',
          flexDirection: 'column',
          height: 322,
          padding: '22px 24px',
          position: 'absolute',
          right: 92,
          top: 168,
          width: 332,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            color: 'rgba(246,255,249,0.52)',
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: 15,
            justifyContent: 'space-between',
            marginBottom: 24,
            textTransform: 'uppercase',
          }}
        >
          <span>page family / alternative</span>
          <span style={{ color }}>loaded</span>
        </div>
        {[
          ['required:', 'rgba(246,255,249,0.42)'],
          ['  + overview', color],
          ['  + comparison', color],
          ['  + faq', color],
          ['', '#ffffff'],
          ['internal links: 4', '#ffffff'],
          ['brief: ready', '#ffffff'],
          ['doctor: 0 findings', color],
        ].map(([line, lineColor], index) => (
          <div
            key={`${line}-${index}`}
            style={{
              color: lineColor,
              display: 'flex',
              fontFamily: 'monospace',
              fontSize: 19,
              lineHeight: 1.28,
              whiteSpace: 'pre',
            }}
          >
            {line}
          </div>
        ))}
      </div>

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 10,
          left: 76,
          position: 'absolute',
          top: 540,
        }}
      >
        {['page contracts', 'agent briefs', 'strict checks'].map((label, index) => (
          <div
            key={label}
            style={{
              alignItems: 'center',
              backgroundColor: index === 2 ? color : 'rgba(255,255,255,0.075)',
              border: index === 2 ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
              color: index === 2 ? '#03110c' : 'rgba(246,255,249,0.82)',
              display: 'flex',
              fontFamily: 'monospace',
              fontSize: 20,
              fontWeight: 700,
              height: 38,
              padding: '0 15px',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div
        style={{
          bottom: -26,
          color: 'rgba(246,255,249,0.055)',
          display: 'flex',
          fontFamily: 'monospace',
          fontSize: 188,
          fontWeight: 900,
          letterSpacing: '-0.08em',
          position: 'absolute',
          right: 18,
        }}
      >
        {':::'}
      </div>
    </div>
  )
}
