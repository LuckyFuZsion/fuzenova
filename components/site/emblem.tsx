import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Emblem({ className }: { className?: string; glow?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/images/brand/emblem.webp" alt="" aria-hidden="true" className={cn('size-6 shrink-0 object-contain', className)} />
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn('flex items-center gap-2.5', className)}
      aria-label="FuzeNova Games home"
    >
      <Emblem className="size-14" />
      <span className="flex flex-col items-center gap-[3px]">
        {/* eslint-disable @next/next/no-img-element */}
        <img src="/images/brand/word-fuzenova.webp" alt="FuzeNova" className="h-[17px] w-auto" />
        <img src="/images/brand/word-games.webp" alt="Games" className="h-[13px] w-auto" />
        {/* eslint-enable @next/next/no-img-element */}
      </span>
    </Link>
  )
}
