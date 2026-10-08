'use client'

import { ArrowRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { games } from '@/lib/games'
import { cn } from '@/lib/utils'
import { StatusBadge } from './primitives'

/** "Play now" button that asks which game to open. */
export function PlayPicker({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className={cn('btn btn-gold', className)}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Play now <ArrowRight className="size-4" aria-hidden="true" />
      </button>

      {open &&
        createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="play-picker-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-line bg-deep p-5 shadow-2xl md:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full text-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <h2 id="play-picker-title" className="heading pr-10 text-2xl md:text-3xl">
              Which game?
            </h2>
            <p className="mt-1 text-muted">Both are free and run in your browser.</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {games.map((g) => (
                <li key={g.slug}>
                  <a
                    href={g.playUrl}
                    className="glow-card group flex h-full flex-col overflow-hidden"
                    style={{ '--glow': g.theme.glow } as React.CSSProperties}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.keyart} alt="" className="aspect-[1200/630] w-full object-cover" />
                    <span className="flex flex-1 flex-col gap-2 p-4">
                      <StatusBadge status={g.status} />
                      <span className="heading text-xl">{g.title}</span>
                      <span className="text-sm text-muted">{g.genre}</span>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold" style={{ color: g.theme.accent }}>
                        {g.playLabel} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>,
          document.body,
        )}
    </>
  )
}
