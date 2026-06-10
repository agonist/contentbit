import type { ReactNode } from 'react'

/*
 * Spec-sheet corner ticks. Wraps the big demo panels so they read like
 * figures in an engineering drawing — the visual signature of "content
 * is a protocol".
 */
const CORNERS = [
  '-top-[0.6em] -left-[0.35em]',
  '-top-[0.6em] -right-[0.35em]',
  '-bottom-[0.6em] -left-[0.35em]',
  '-bottom-[0.6em] -right-[0.35em]',
]

export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {CORNERS.map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={`text-muted-foreground/60 absolute font-mono text-sm leading-none select-none ${pos}`}
        >
          +
        </span>
      ))}
      {children}
    </div>
  )
}
