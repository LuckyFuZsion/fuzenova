import {
  Bot,
  BookOpen,
  Cloud,
  Crosshair,
  Crown,
  Expand,
  Eye,
  Factory,
  Flame,
  FlaskConical,
  Gauge,
  Gem,
  Hammer,
  Heart,
  Medal,
  Map,
  Rabbit,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import type { Faq, Feature, FeatureIcon } from '@/lib/games'
import { cn } from '@/lib/utils'
import { Emblem } from './emblem'
import { Reveal } from './reveal'

const icons: Record<FeatureIcon, LucideIcon> = {
  flame: Flame,
  swords: Swords,
  shield: Shield,
  hammer: Hammer,
  map: Map,
  book: BookOpen,
  skull: Skull,
  gauge: Gauge,
  cloud: Cloud,
  factory: Factory,
  crosshair: Crosshair,
  bot: Bot,
  flask: FlaskConical,
  expand: Expand,
  sparkles: Sparkles,
  crown: Crown,
  gem: Gem,
  rabbit: Rabbit,
  timer: Timer,
  eye: Eye,
  heart: Heart,
  medal: Medal,
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('eyebrow flex items-center gap-2', className)}>
      <Emblem className="size-3.5" glow={false} />
      {children}
    </p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  center,
  action,
}: {
  eyebrow: string
  title: React.ReactNode
  intro?: string
  center?: boolean
  action?: React.ReactNode
}) {
  return (
    <Reveal
      className={cn(
        'mb-10 flex flex-col gap-4 md:mb-14',
        center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between',
      )}
    >
      <div className={cn('flex max-w-2xl flex-col gap-4', center && 'items-center')}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="heading text-3xl text-balance md:text-5xl">{title}</h2>
        {intro && <p className="text-lg leading-relaxed text-pretty text-muted">{intro}</p>}
      </div>
      {action}
    </Reveal>
  )
}

export function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28', className)}>
      {children}
    </section>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const live = status === 'Out now'
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-void/70 px-3 py-1 text-xs font-bold tracking-wider text-foreground uppercase backdrop-blur">
      <span className={cn('size-1.5 rounded-full', live ? 'bg-loam shadow-[0_0_8px_var(--loam)]' : 'bg-ember shadow-[0_0_8px_var(--ember)]')} />
      {status}
    </span>
  )
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-line px-3 py-1 text-sm text-muted">{children}</span>
}

export function FeatureGrid({ features, accent }: { features: Feature[]; accent: string }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f, i) => {
        const Icon = icons[f.icon]
        return (
          <li key={f.title}>
            <Reveal delay={(i % 3) * 0.06} className="glass-card h-full p-6" >
              {f.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.image} alt="" aria-hidden="true" width={64} height={64} className="mb-5 size-16" />
              ) : (
                <div
                  className="mb-5 inline-flex size-11 items-center justify-center rounded-xl border"
                  style={{ borderColor: `${accent}55`, color: accent, background: `${accent}14` }}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </div>
              )}
              <h3 className="heading mb-2 text-lg">{f.title}</h3>
              <p className="leading-relaxed text-muted">{f.body}</p>
            </Reveal>
          </li>
        )
      })}
    </ul>
  )
}

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      {items.map((item) => (
        <details key={item.q} className="faq glass-card group p-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-bold">
            {item.q}
            <span aria-hidden="true" className="text-2xl leading-none text-dawn transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="px-6 pb-6 leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  )
}

export function PageIntro({ eyebrow, title, intro }: { eyebrow: string; title: React.ReactNode; intro?: string }) {
  return (
    <div className="relative overflow-hidden">
      <div className="page-glow" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-5 px-5 pt-20 pb-12 text-center md:pt-28">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="heading text-4xl text-balance md:text-6xl">{title}</h1>
        {intro && <p className="max-w-2xl text-lg leading-relaxed text-pretty text-muted">{intro}</p>}
      </div>
    </div>
  )
}
