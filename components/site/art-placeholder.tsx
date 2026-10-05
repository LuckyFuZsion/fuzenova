import { cn } from '@/lib/utils'
import { Emblem } from './emblem'

export function ArtPlaceholder({
  src,
  alt,
  from,
  to,
  glow,
  className,
}: {
  src: string
  alt: string
  from: string
  to: string
  glow: string
  className?: string
}) {
  const file = src.split('/').pop()
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn('relative overflow-hidden', className)}
      style={{
        background: `radial-gradient(60% 70% at 70% 30%, ${glow}55, transparent 70%), radial-gradient(50% 60% at 20% 90%, ${to}, transparent), linear-gradient(140deg, ${from}, ${to})`,
      }}
    >
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:28px_28px]" />
      <Emblem className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 opacity-40" />
      <span className="absolute bottom-3 left-4 font-mono text-[11px] tracking-wider text-foreground/40">{file}</span>
    </div>
  )
}
