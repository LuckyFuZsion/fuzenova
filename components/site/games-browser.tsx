'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'out-now' | 'in-development'
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'out-now', label: 'Out now' },
  { id: 'in-development', label: 'In development' },
]

export function GamesBrowser({ cards }: { cards: { slug: string; group: Exclude<Filter, 'all'>; node: React.ReactNode }[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const visible = cards.filter((c) => filter === 'all' || c.group === filter)

  return (
    <div className="flex flex-col gap-10">
      <div role="group" aria-label="Filter games" className="flex flex-wrap justify-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full border px-5 py-2 text-sm font-bold transition-colors',
              filter === f.id ? 'border-dawn bg-dawn text-void' : 'border-line text-muted hover:border-dawn hover:text-dawn',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        {visible.map((c) => (
          <li key={c.slug}>{c.node}</li>
        ))}
      </ul>
    </div>
  )
}
