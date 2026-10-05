import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { GamePlayer } from '@/components/site/game-player'
import { games, type Game } from '@/lib/games'

type Params = { slug: string }

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const game = games.find((g) => g.slug === slug)
  if (!game) return { title: 'Play' }
  return {
    title: `Play ${game.title}`,
    description: game.shortDescription,
    robots: { index: false, follow: true },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
  colorScheme: 'dark',
}

export default async function GoPlayPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const game = games.find((g) => g.slug === slug) as Game | undefined
  if (!game) notFound()

  // Static game HTML lives under public/play/<slug>/ — keep that path for the iframe.
  const src = `/play/${game.slug}/index.html`

  return (
    <GamePlayer
      title={game.title}
      src={src}
      backHref={`/games/${game.slug}`}
      accent={game.theme.accent}
    />
  )
}
