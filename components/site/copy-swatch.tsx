'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function CopySwatch({ name, hex }: { name: string; hex: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(hex)
          setCopied(true)
          toast.success(`Copied ${name} ${hex}`)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error('Could not copy. Please copy it by hand.')
        }
      }}
      className="glass-card flex items-center gap-4 p-3 text-left"
      aria-label={`Copy ${name} colour ${hex}`}
    >
      <span className="size-12 shrink-0 rounded-lg border border-line" style={{ background: hex }} />
      <span className="flex flex-col">
        <span className="font-bold">{name}</span>
        <span className="font-mono text-sm text-muted">{hex}</span>
      </span>
      {copied ? (
        <Check className="ml-auto size-4 text-loam" aria-hidden="true" />
      ) : (
        <Copy className="ml-auto size-4 text-muted" aria-hidden="true" />
      )}
    </button>
  )
}
