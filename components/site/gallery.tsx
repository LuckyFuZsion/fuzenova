'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArtPlaceholder } from './art-placeholder'

export type GalleryItem = { src: string; alt: string; exists: boolean }
type Colours = { from: string; to: string; glow: string }

function Shot({ item, colours, sizes }: { item: GalleryItem; colours: Colours; sizes: string }) {
  if (item.exists) {
    return <Image src={item.src} alt={item.alt} fill sizes={sizes} className="object-cover" />
  }
  return <ArtPlaceholder src={item.src} alt={item.alt} {...colours} className="absolute inset-0" />
}

export function Gallery({ items, colours }: { items: GalleryItem[]; colours: Colours }) {
  const [index, setIndex] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const step = useCallback(
    (dir: number) => setIndex((i) => (i === null ? i : (i + dir + items.length) % items.length)),
    [items.length],
  )
  const close = useCallback(() => {
    setIndex(null)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (index === null) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [index, step, close])

  return (
    <>
      <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
        {items.map((item, i) => (
          <li key={item.src} className="w-[80%] shrink-0 snap-center md:w-auto">
            <button
              type="button"
              onClick={(e) => {
                triggerRef.current = e.currentTarget
                setIndex(i)
              }}
              className="glass-card relative block aspect-video w-full overflow-hidden p-0"
              aria-label={`Open screenshot ${i + 1} of ${items.length}`}
            >
              <Shot item={item} colours={colours} sizes="(min-width: 768px) 33vw, 80vw" />
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {index !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Screenshot ${index + 1} of ${items.length}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-void/95 p-4 backdrop-blur"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          >
            <motion.div
              key={index}
              className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border border-line"
              drag={reduce ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) step(1)
                if (info.offset.x > 60) step(-1)
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Shot item={items[index]} colours={colours} sizes="100vw" />
            </motion.div>
            <button ref={closeRef} type="button" onClick={close} className="lightbox-btn absolute top-4 right-4" aria-label="Close">
              <X className="size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                step(-1)
              }}
              className="lightbox-btn absolute left-4"
              aria-label="Previous screenshot"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                step(1)
              }}
              className="lightbox-btn absolute right-4"
              aria-label="Next screenshot"
            >
              <ChevronRight className="size-5" />
            </button>
            <p className="absolute bottom-6 text-sm text-muted" aria-live="polite">
              {index + 1} / {items.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
