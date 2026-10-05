import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Game } from '@/lib/games'
import { cn } from '@/lib/utils'
import { GameArt } from './game-art'
import { Chip, StatusBadge } from './primitives'

export function GameCard({ game, size = 'md' }: { game: Game; size?: 'md' | 'lg' }) {
  const t = game.theme
  return (
    <article className="glow-card flex h-full flex-col overflow-hidden" style={{ '--glow': t.glow } as React.CSSProperties}>
      <div className="relative">
        <GameArt
          src={game.keyart}
          alt={`${game.title} key art`}
          from={t.bgFrom}
          to={t.bgTo}
          glow={t.glow}
          className={'aspect-[1200/630] w-full'}
        />
        <div className="absolute top-4 left-4">
          <StatusBadge status={game.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6 md:p-7">
        <p className="eyebrow">{game.genre}</p>
        <h3 className={cn('heading', size === 'lg' ? 'text-3xl' : 'text-2xl')}>{game.title}</h3>
        <p className="leading-relaxed text-muted">{size === 'lg' ? game.tagline + ' ' + game.shortDescription : game.shortDescription}</p>
        <div className="flex flex-wrap gap-2">
          {game.platforms.map((p) => (
            <Chip key={p}>{p}</Chip>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap gap-3 pt-2">
          <a href={game.playUrl} className="btn btn-gold">
            Play free <ArrowRight className="size-4" aria-hidden="true" />
          </a>
          <Link href={`/games/${game.slug}`} className="btn btn-outline">
            Learn more<span className="sr-only"> about {game.title}</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
