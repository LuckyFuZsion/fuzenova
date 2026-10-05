import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Game } from '@/lib/games'
import { GameArt } from './game-art'
import { Chip, StatusBadge } from './primitives'
import { Reveal } from './reveal'

export function GameHero({ game, note, children }: { game: Game; note?: string; children?: React.ReactNode }) {
  const t = game.theme
  return (
    <section className="relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${t.bgFrom}, ${t.bgTo})` }}>
      {children}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ background: `radial-gradient(50% 60% at 75% 40%, ${t.glow}33, transparent 70%)` }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1fr_1.15fr]">
        <Reveal className="flex flex-col items-start gap-5">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/games" className="hover:text-dawn">
              Games
            </Link>{' '}
            / <span aria-current="page">{game.title}</span>
          </nav>
          <StatusBadge status={game.status} />
          <h1 className="heading text-4xl text-balance md:text-6xl">{game.title}</h1>
          <p className="heading text-xl md:text-2xl" style={{ color: t.accent }}>
            {game.tagline}
          </p>
          <p className="text-lg leading-relaxed text-pretty text-foreground/85">{game.pitch}</p>
          <div className="flex flex-wrap gap-2">
            <Chip>{game.genre}</Chip>
            {game.platforms.map((p) => (
              <Chip key={p}>{p}</Chip>
            ))}
            <Chip>Free</Chip>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a href={game.playUrl} className="btn btn-gold" style={{ background: t.accent, boxShadow: `0 0 32px ${t.accent}55` }}>
              {game.playLabel} <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            {note && <span className="text-sm text-muted">{note}</span>}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-line" style={{ boxShadow: `0 30px 80px -20px ${t.glow}66` }}>
            <GameArt src={game.keyart} alt={`${game.title} key art`} from={t.bgFrom} to={t.bgTo} glow={t.glow} className="aspect-[1200/630] w-full" priority />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function galleryItems(game: Game, exists: (src: string) => boolean) {
  return game.screenshots.map((src, i) => ({ src, alt: `${game.title} screenshot ${i + 1}`, exists: exists(src) }))
}
