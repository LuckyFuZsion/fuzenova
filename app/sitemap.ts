import type { MetadataRoute } from 'next'
import { posts } from '@/lib/devlog'
import { games } from '@/lib/games'
import { site } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/games', '/devlog', '/studio', '/press', '/contact', '/privacy']
  return [
    ...pages.map((p) => ({ url: `${site.url}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...games.map((g) => ({ url: `${site.url}/games/${g.slug}`, priority: 0.9 })),
    ...posts.map((p) => ({ url: `${site.url}/devlog/${p.slug}`, lastModified: p.date, priority: 0.5 })),
  ]
}
