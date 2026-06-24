export interface BlogProps {
  category: string
  title: string
  excerpt: string
  author: string
  meta: string
  avatar?: string
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

const titleSize = (title: string) => {
  if (title.length > 74) return 56
  if (title.length > 58) return 64
  if (title.length > 42) return 72
  return 82
}

export const Blog = ({ category, title, excerpt, author, meta, avatar, accent }: BlogProps) => {
  const color = accent ?? '#10b981'
  const metaItems = meta.split(' · ').filter(Boolean)
  const safeAvatar = avatar?.trim()

  return (
    <div
      style={{
        backgroundColor: '#07110d',
        backgroundImage:
          'linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,0.035) 1px, transparent 1px), radial-gradient(circle at 82% 22%, rgba(16,185,129,0.24), transparent 34%), radial-gradient(circle at 18% 92%, rgba(226,232,240,0.12), transparent 30%)',
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
          display: 'flex',
          height: 7,
          left: 42,
          position: 'absolute',
          right: 42,
          top: 42,
        }}
      />

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 18,
          left: 76,
          position: 'absolute',
          top: 74,
        }}
      >
        {safeAvatar ? (
          <img
            alt={author}
            height={48}
            src={safeAvatar}
            style={{ border: '1px solid rgba(255,255,255,0.16)' }}
            width={48}
          />
        ) : (
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
        )}
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            fontSize: 28,
            fontWeight: 700,
            gap: 16,
            letterSpacing: '-0.02em',
          }}
        >
          <span>{author}</span>
          <span style={{ color, fontFamily: 'monospace', fontSize: 18 }}>/{category}</span>
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
        validated article
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          left: 76,
          position: 'absolute',
          top: 170,
          width: 760,
        }}
      >
        <div
          style={{
            color: '#ffffff',
            display: 'flex',
            fontSize: titleSize(title),
            fontWeight: 760,
            letterSpacing: '-0.055em',
            lineHeight: 0.95,
          }}
        >
          {trimText(title, 98)}
        </div>
        <div
          style={{
            color: 'rgba(246,255,249,0.72)',
            display: 'flex',
            fontSize: 28,
            lineHeight: 1.32,
            marginTop: 28,
            width: 700,
          }}
        >
          {trimText(excerpt, 150)}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          left: 76,
          position: 'absolute',
          top: 532,
        }}
      >
        {metaItems.map((item, index) => (
          <div
            key={item}
            style={{
              alignItems: 'center',
              backgroundColor: index === metaItems.length - 1 ? color : 'rgba(255,255,255,0.075)',
              border:
                index === metaItems.length - 1
                  ? '1px solid transparent'
                  : '1px solid rgba(255,255,255,0.12)',
              color: index === metaItems.length - 1 ? '#03110c' : 'rgba(246,255,249,0.82)',
              display: 'flex',
              fontFamily: 'monospace',
              fontSize: 20,
              fontWeight: 700,
              height: 38,
              padding: '0 15px',
            }}
          >
            {item}
          </div>
        ))}
      </div>

      <div
        style={{
          bottom: 64,
          color: 'rgba(246,255,249,0.42)',
          display: 'flex',
          fontFamily: 'monospace',
          fontSize: 18,
          position: 'absolute',
          right: 76,
        }}
      >
        contentbit.dev/blog
      </div>

      <div
        style={{
          backgroundColor: 'rgba(6,17,13,0.86)',
          border: '1px solid rgba(246,255,249,0.14)',
          display: 'flex',
          flexDirection: 'column',
          height: 330,
          padding: '22px 24px',
          position: 'absolute',
          right: 82,
          top: 164,
          width: 334,
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
            marginBottom: 22,
            textTransform: 'uppercase',
          }}
        >
          <span>article.md</span>
          <span style={{ color }}>valid</span>
        </div>
        {[
          ['---', 'rgba(246,255,249,0.42)'],
          ['title: release notes', '#ffffff'],
          ['description: checked', '#ffffff'],
          ['date: 2026-06-24', '#ffffff'],
          ['---', 'rgba(246,255,249,0.42)'],
          [':::callout', color],
          ['type: success', '#ffffff'],
          ['body: validates in CI', '#ffffff'],
          [':::', color],
        ].map(([line, lineColor], index) => (
          <div
            key={`${line}-${index}`}
            style={{
              color: lineColor,
              display: 'flex',
              fontFamily: 'monospace',
              fontSize: 19,
              lineHeight: 1.3,
              whiteSpace: 'pre',
            }}
          >
            {line}
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
