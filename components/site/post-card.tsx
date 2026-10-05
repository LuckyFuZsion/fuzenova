import Link from 'next/link'
import { type DevlogPost, formatDate } from '@/lib/devlog'
import { tagColour, tagLabel } from '@/lib/site'
import { GameArt } from './game-art'

export function PostTag({ game }: { game: DevlogPost['game'] }) {
  const colour = tagColour[game]
  return (
    <span className="rounded-full border px-3 py-1 text-xs font-bold tracking-wider uppercase" style={{ color: colour, borderColor: `${colour}55` }}>
      {tagLabel[game]}
    </span>
  )
}

export function PostCard({ post }: { post: DevlogPost }) {
  const colour = tagColour[post.game]
  return (
    <article className="glow-card group relative flex h-full flex-col overflow-hidden" style={{ '--glow': colour } as React.CSSProperties}>
      <GameArt src={post.cover} alt="" from="#121840" to="#0B1030" glow={colour} className="aspect-[1200/630] w-full" sizes="(min-width: 1024px) 33vw, 100vw" />
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PostTag game={post.game} />
          <time dateTime={post.date} className="text-sm text-muted">
            {formatDate(post.date)}
          </time>
        </div>
        <h3 className="heading text-xl text-balance">
          <Link href={`/devlog/${post.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {post.title}
          </Link>
        </h3>
        <p className="leading-relaxed text-muted">{post.excerpt}</p>
      </div>
    </article>
  )
}
