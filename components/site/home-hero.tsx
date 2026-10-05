import { ArrowRight, Cloud, Download, Gamepad2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { getGame } from '@/lib/games'
import { site } from '@/lib/site'
import { Emblem } from './emblem'
import { Reveal } from './reveal'

const trustItems = [
  { icon: Sparkles, label: 'Free to play' },
  { icon: Download, label: 'No download' },
  { icon: Gamepad2, label: 'Plays on phone & desktop' },
  { icon: Cloud, label: 'Cloud saves' },
]

export function HomeHero() {
  const crystal = getGame('crystalbound-saga')
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden">
      <div className="nova-stage" aria-hidden="true">
        <div className="starfield" />
        <div className="bloom bloom-ember" />
        <div className="bloom bloom-loam" />
        <div className="bloom bloom-tide" />
        <div className="bloom bloom-storm" />
        <div className="core-glow" />
      </div>
      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 px-5 py-24 text-center md:px-8">
        <Reveal>
          <Emblem className="size-20 md:size-28" />
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="heading text-4xl text-balance sm:text-5xl md:text-7xl">{site.line}</h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-pretty text-muted md:text-xl">{site.subline}</p>
        </Reveal>
        <Reveal delay={0.15} className="flex flex-wrap justify-center gap-3">
          <a href={crystal.playUrl} className="btn btn-gold">
            Play {crystal.title} <ArrowRight className="size-4" aria-hidden="true" />
          </a>
          <Link href="/games" className="btn btn-outline">
            Explore our games
          </Link>
        </Reveal>
        <Reveal delay={0.2}>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 pt-4 text-sm text-muted">
            {trustItems.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4 text-dawn" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
