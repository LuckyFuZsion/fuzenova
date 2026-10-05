import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { GameArt } from '@/components/site/game-art'
import { PostTag } from '@/components/site/post-card'
import { formatDate, getPost, posts } from '@/lib/devlog'
import { tagColour } from '@/lib/site'

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/devlog/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description: post.excerpt, publishedTime: post.date, images: [post.cover] },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-16 md:py-24">
      <Link href="/devlog" className="flex items-center gap-2 text-sm text-muted hover:text-dawn">
        <ArrowLeft className="size-4" aria-hidden="true" /> All posts
      </Link>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <PostTag game={post.game} />
          <time dateTime={post.date} className="text-sm text-muted">
            {formatDate(post.date)}
          </time>
        </div>
        <h1 className="heading text-3xl text-balance md:text-5xl">{post.title}</h1>
        <p className="text-lg leading-relaxed text-muted">{post.excerpt}</p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-line">
        <GameArt src={post.cover} alt="" from="#121840" to="#0B1030" glow={tagColour[post.game]} className="aspect-[1200/630] w-full" sizes="(min-width: 768px) 768px, 100vw" priority />
      </div>
      <div className="flex flex-col gap-5 text-lg leading-relaxed text-foreground/90">
        {post.body.map((block, i) =>
          typeof block === 'string' ? (
            <p key={i}>{block}</p>
          ) : 'heading' in block ? (
            <h2 key={i} className="heading mt-4 text-2xl text-balance md:text-3xl">
              {block.heading}
            </h2>
          ) : (
            <figure key={i} className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-2xl border border-line">
                <Image src={block.image} alt={block.alt} width={1200} height={630} sizes="(min-width: 768px) 768px, 100vw" className="h-auto w-full" />
              </div>
              {block.caption && <figcaption className="text-center text-sm text-muted">{block.caption}</figcaption>}
            </figure>
          ),
        )}
      </div>
    </article>
  )
}
