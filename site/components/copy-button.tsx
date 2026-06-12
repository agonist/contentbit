'use client'

import { cn } from '@/lib/utils'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export function CopyButton({
  value,
  className,
  onCopy,
}: {
  value: string
  className?: string
  onCopy?: () => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label="Copy to clipboard"
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
        className,
      )}
      onClick={() => {
        void navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
        onCopy?.()
      }}
    >
      {copied ? (
        <Check className="animate-in zoom-in-50 size-3.5 text-emerald-500 duration-200" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  )
}
