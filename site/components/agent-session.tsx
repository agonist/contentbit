'use client'

import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/*
 * Scripted coding-agent transcript — a terminal/chat hybrid showing the
 * author-skill loop (instructions → write → validate → fix → exit 0).
 * Steps render visible by default; once mounted with motion allowed, they
 * stagger in on scroll as progressive enhancement.
 */

export type AgentStep =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'skill'; name: string }
  | { kind: 'command'; command: string; output?: string; exitCode?: number }

export interface AgentSessionProps {
  /** Header label. */
  title?: string
  steps: AgentStep[]
}

export function AgentSession({ title = 'claude', steps }: AgentSessionProps) {
  const [revealed, setRevealed] = useState(true)
  const [animate, setAnimate] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = rootRef.current
    if (!root) return
    // Already on screen? Leave it visible — only animate below-the-fold entries.
    if (root.getBoundingClientRect().top < window.innerHeight) return
    setRevealed(false)
    setAnimate(true)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

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
      </div>
      <div className="flex flex-col">
        {steps.map((step, i) => (
          <div
            key={i}
            className={
              animate
                ? `transition-all duration-500 ${revealed ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`
                : undefined
            }
            style={animate ? { transitionDelay: `${i * 120}ms` } : undefined}
          >
            <Step step={step} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Step({ step }: { step: AgentStep }) {
  switch (step.kind) {
    case 'user':
      return (
        <div className="flex gap-2 border-b bg-muted/40 px-4 py-2.5 text-sm">
          <span className="font-mono text-muted-foreground">&gt;</span>
          <span>{step.text}</span>
        </div>
      )
    case 'assistant':
      return <div className="border-b px-4 py-2.5 text-sm leading-relaxed">{step.text}</div>
    case 'skill':
      return (
        <div className="border-b px-4 py-2">
          <span className="inline-flex items-center gap-1.5 border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
            <Sparkles className="size-3" aria-hidden />
            Skill: {step.name}
          </span>
        </div>
      )
    case 'command': {
      const failed = (step.exitCode ?? 0) > 0
      return (
        <div className="border-b px-4 py-2.5 font-mono text-[12.5px] leading-relaxed">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-foreground">
              <span className="text-muted-foreground">$ </span>
              {step.command}
            </span>
            {step.exitCode !== undefined && (
              <span
                className={`ml-auto shrink-0 text-xs ${
                  failed ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                exit {step.exitCode}
              </span>
            )}
          </div>
          {step.output !== undefined && (
            <pre className="m-0 mt-1 overflow-x-auto whitespace-pre-wrap bg-transparent p-0">
              <code>
                {step.output.split('\n').map((line, i) => (
                  <span
                    key={i}
                    className={`block ${
                      failed && i === 0 ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {line === '' ? ' ' : line}
                  </span>
                ))}
              </code>
            </pre>
          )}
        </div>
      )
    }
  }
}
