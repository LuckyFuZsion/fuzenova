import { notFound, redirect } from 'next/navigation'
import { games } from '@/lib/games'

type Params = { slug: string }

export function generateStaticParams() {
  return games.map((g) => ({ slug: g.slug }))
}

// Old /go/<game> links go straight to the game, which fills the whole screen by itself.
export default async function GoPlayPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const game = games.find((g) => g.slug === slug)
  if (!game) notFound()
  redirect(game.playUrl)
}
