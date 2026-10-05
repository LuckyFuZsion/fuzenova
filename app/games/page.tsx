import type { Metadata } from 'next'
import { ContactBanner } from '@/components/site/cta'
import { GameCard } from '@/components/site/game-card'
import { GamesBrowser } from '@/components/site/games-browser'
import { PageIntro, Section } from '@/components/site/primitives'
import { games } from '@/lib/games'

export const metadata: Metadata = {
  title: 'Games',
  description: 'Every FuzeNova game. Free to play in your browser on phone and desktop, with cloud saves.',
  alternates: { canonical: '/games' },
}

export default function GamesPage() {
  const cards = games.map((g) => ({
    slug: g.slug,
    group: g.inDevelopment ? ('in-development' as const) : ('out-now' as const),
    node: <GameCard game={g} />,
  }))
  return (
    <>
      <PageIntro eyebrow="Games" title="Every world we have forged" intro="All free, all in your browser. Pick one and press play." />
      <Section className="pt-4 md:pt-4">
        <GamesBrowser cards={cards} />
      </Section>
      <ContactBanner />
    </>
  )
}
