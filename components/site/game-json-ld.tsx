import type { Game } from '@/lib/games'
import { site } from '@/lib/site'

export function GameJsonLd({ game }: { game: Game }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: game.longDescription,
    genre: game.genre,
    gamePlatform: 'Web browser',
    url: `${site.url}/games/${game.slug}`,
    image: `${site.url}${game.keyart}`,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'GBP', availability: 'https://schema.org/InStock' },
    publisher: { '@type': 'Organization', name: 'FuzeNova Games' },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
