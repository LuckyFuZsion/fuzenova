'use client'

import { Expand, Minimize2, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  title: string
  src: string
  backHref: string
  accent: string
}

function isFullscreen() {
  return Boolean(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement)
}

async function enterFullscreen(el: HTMLElement) {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void
    webkitRequestFullScreen?: () => Promise<void> | void
  }
  if (el.requestFullscreen) await el.requestFullscreen()
  else if (anyEl.webkitRequestFullscreen) await anyEl.webkitRequestFullscreen()
  else if (anyEl.webkitRequestFullScreen) await anyEl.webkitRequestFullScreen()
}

async function exitFullscreen() {
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void }
  if (document.exitFullscreen) await document.exitFullscreen()
  else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
}

export function GamePlayer({ title, src, backHref, accent }: Props) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [fs, setFs] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const hideTimer = useRef<number | null>(null)

  const bumpChrome = useCallback(() => {
    setChromeVisible(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setChromeVisible(false), 2800)
  }, [])

  useEffect(() => {
    const sync = () => setFs(isFullscreen())
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync as EventListener)
    bumpChrome()
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync as EventListener)
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [bumpChrome])

  const toggleFullscreen = async () => {
    try {
      if (isFullscreen()) await exitFullscreen()
      else if (shellRef.current) await enterFullscreen(shellRef.current)
    } catch {
      // iOS Safari often blocks Fullscreen API; the shell is already edge-to-edge.
    }
    bumpChrome()
  }

  return (
    <div
      ref={shellRef}
      className="relative bg-black text-white"
      style={{ width: '100vw', height: '100dvh' }}
      onPointerDown={bumpChrome}
    >
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 size-full border-0 bg-black"
        allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope"
        allowFullScreen
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-3 pt-[max(0.65rem,env(safe-area-inset-top))] transition-opacity duration-300"
        style={{ opacity: chromeVisible ? 1 : 0 }}
      >
        <Link
          href={backHref}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-2 text-sm font-bold backdrop-blur-md"
          style={{ boxShadow: `0 0 0 1px ${accent}55` }}
        >
          <X className="size-4" aria-hidden="true" />
          Exit
        </Link>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-2 text-sm font-bold backdrop-blur-md"
          style={{ boxShadow: `0 0 0 1px ${accent}55` }}
          aria-pressed={fs}
        >
          {fs ? <Minimize2 className="size-4" aria-hidden="true" /> : <Expand className="size-4" aria-hidden="true" />}
          {fs ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>
    </div>
  )
}
