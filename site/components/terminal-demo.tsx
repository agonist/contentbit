'use client'

import { useEffect, useRef, useState } from 'react'

/*
 * Auto-typing terminal. Renders the full transcript on the server and for
 * prefers-reduced-motion users; otherwise types command lines character by
 * character once scrolled into view. A hidden full-height sizer prevents
 * layout shift while the animation runs.
 */

export interface TerminalLine {
  text: string
  /** `command` lines are typed; the rest appear whole. */
  type?: 'command' | 'output' | 'success' | 'error'
  /** ms pause before advancing past this line. */
  delay?: number
}

export interface TerminalDemoProps {
  /** Header label, e.g. the cwd. */
  title?: string
  lines: TerminalLine[]
  /** ms per typed character. */
  speed?: number
  /** Show a replay control once the animation finishes. */
  replayable?: boolean
}

const LINE_CLASS: Record<NonNullable<TerminalLine['type']>, string> = {
  command: 'text-foreground font-medium',
  output: 'text-muted-foreground',
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-destructive',
}

function lineType(line: TerminalLine) {
  return line.type ?? 'output'
}

export function TerminalDemo({ title = '~', lines, speed = 25, replayable }: TerminalDemoProps) {
  // 'static' renders everything (server, reduced motion); 'animated' types.
  const [mode, setMode] = useState<'static' | 'animated'>('static')
  const [started, setStarted] = useState(false)
  const [pos, setPos] = useState({ line: 0, char: 0 })
  const rootRef = useRef<HTMLDivElement>(null)

  const done = pos.line >= lines.length

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setMode('animated')
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (mode !== 'animated' || !started || done) return
    const line = lines[pos.line]
    if (lineType(line) === 'command' && pos.char < line.text.length) {
      const t = setTimeout(() => setPos((p) => ({ ...p, char: p.char + 1 })), speed)
      return () => clearTimeout(t)
    }
    const pause = line.delay ?? (lineType(line) === 'command' ? 350 : 120)
    const t = setTimeout(() => setPos((p) => ({ line: p.line + 1, char: 0 })), pause)
    return () => clearTimeout(t)
  }, [mode, started, done, pos, lines, speed])

  function renderLine(line: TerminalLine, visibleText: string, cursor: boolean, key: number) {
    const type = lineType(line)
    return (
      <div key={key} className={LINE_CLASS[type]}>
        {type === 'command' && <span className="text-muted-foreground">$ </span>}
        {visibleText === '' && type !== 'command' ? ' ' : visibleText}
        {cursor && <span className="caret" />}
      </div>
    )
  }

  const animatedLines =
    mode === 'static' || !started
      ? null
      : lines.slice(0, Math.min(pos.line + 1, lines.length)).map((line, i) => {
          const current = i === pos.line
          const text =
            current && lineType(line) === 'command' ? line.text.slice(0, pos.char) : line.text
          return renderLine(line, text, current || (done && i === lines.length - 1), i)
        })

  return (
    <div
      ref={rootRef}
      className="not-prose my-6 overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className="flex h-9 items-center gap-1.5 border-b px-4 font-mono text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-red-400/80" />
        <span className="size-2 rounded-full bg-amber-400/80" />
        <span className="size-2 rounded-full bg-emerald-400/80" />
        <span className="ml-2">{title}</span>
        {replayable && mode === 'animated' && done && (
          <button
            type="button"
            className="ml-auto hover:text-foreground"
            onClick={() => setPos({ line: 0, char: 0 })}
          >
            replay
          </button>
        )}
      </div>
      <div className="relative p-4 font-mono text-[12.5px] leading-relaxed">
        {mode === 'static' ? (
          <div>{lines.map((line, i) => renderLine(line, line.text, false, i))}</div>
        ) : (
          <>
            {/* Screen readers get the full transcript; the sizer is layout-only. */}
            <span className="sr-only">
              {lines.map((l) => (lineType(l) === 'command' ? `$ ${l.text}` : l.text)).join('\n')}
            </span>
            <div className="invisible" aria-hidden>
              {lines.map((line, i) => renderLine(line, line.text, false, i))}
            </div>
            <div className="absolute inset-0 p-4" aria-hidden>
              {animatedLines}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
