'use client'

import { CopyButton } from '@/components/copy-button'
import { cn } from '@/lib/utils'
import posthog from 'posthog-js'
import { useEffect, useState } from 'react'

/*
 * Package-manager switcher for install commands. The choice persists across
 * every instance on the site, shadcn-style.
 */

const MANAGERS = ['pnpm', 'npm', 'bun', 'yarn'] as const

type Pm = (typeof MANAGERS)[number]

/** dlx-style runner per package manager. */
function runner(pm: Pm, rest: string): string {
  if (pm === 'pnpm') return `pnpm dlx ${rest}`
  if (pm === 'bun') return `bunx ${rest}`
  if (pm === 'yarn') return `yarn dlx ${rest}`
  return `npx ${rest}`
}

const STORAGE_KEY = 'contentbit-pm'

/** `command` is the dlx-style remainder, e.g. "contentbit@latest init". */
export function InstallTabs({ command }: { command: string }) {
  const [pm, setPm] = useState<Pm>('pnpm')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Pm | null
    if (saved && MANAGERS.includes(saved)) setPm(saved)
    // Every switcher on the page follows the same selection.
    const onSync = (e: Event) => setPm((e as CustomEvent<Pm>).detail)
    window.addEventListener(STORAGE_KEY, onSync)
    return () => window.removeEventListener(STORAGE_KEY, onSync)
  }, [])

  function select(next: Pm) {
    if (next === pm) return
    setPm(next)
    localStorage.setItem(STORAGE_KEY, next)
    window.dispatchEvent(new CustomEvent(STORAGE_KEY, { detail: next }))
    posthog.capture('package_manager_selected', { package_manager: next, command })
  }

  const value = runner(pm, command)

  return (
    <div className="bg-card border text-left shadow-sm">
      <div className="flex items-center border-b">
        {MANAGERS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => select(m)}
            aria-pressed={m === pm}
            className={cn(
              'border-r px-3 py-1.5 font-mono text-xs transition-colors',
              m === pm
                ? 'bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 py-1.5 pr-1.5 pl-4">
        <code className="text-muted-foreground flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap">
          <span className="text-foreground/50 select-none">$ </span>
          {value}
        </code>
        <CopyButton
          value={value}
          onCopy={() =>
            posthog.capture('install_command_copied', {
              package_manager: pm,
              command,
              full_command: value,
            })
          }
        />
      </div>
    </div>
  )
}
