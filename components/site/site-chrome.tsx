'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

/** Hides studio chrome on fullscreen play routes (`/go/...`). */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const fullscreenPlay = pathname === '/go' || pathname.startsWith('/go/')

  useEffect(() => {
    if (!fullscreenPlay) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      document.documentElement.style.overflow = ''
    }
  }, [fullscreenPlay])

  if (fullscreenPlay) {
    return <main id="main">{children}</main>
  }

  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  )
}
