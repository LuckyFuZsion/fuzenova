import { Smartphone } from 'lucide-react'
import type { Metadata } from 'next'
import { FinalCta } from '@/components/site/cta'
import { GameArt } from '@/components/site/game-art'
import { GameHero, galleryItems } from '@/components/site/game-hero'
import { GameJsonLd } from '@/components/site/game-json-ld'
import { Gallery } from '@/components/site/gallery'
import { FaqList, FeatureGrid, Section, SectionHeading } from '@/components/site/primitives'
import { Reveal } from '@/components/site/reveal'
import { assetExists } from '@/lib/assets'
import { elements, getGame, guardians } from '@/lib/games'

const game = getGame('crystalbound-saga')

export const metadata: Metadata = {
  title: `${game.title}: ${game.tagline}`,
  description: game.shortDescription,
  alternates: { canonical: `/games/${game.slug}` },
  openGraph: { title: game.title, description: game.shortDescription, images: [game.keyart] },
}

const steps = [
  { title: 'Match', body: 'Swap tiles to line up 3 or more of the same element.' },
  { title: 'Hit the weakness', body: "Strike with the element your foe is weak to for double damage." },
  { title: 'Unleash an Art', body: "When a Guardian's gauge is full, cast their Art to turn the fight." },
]

export default function CrystalboundPage() {
  const t = game.theme
  return (
    <div style={{ background: `linear-gradient(180deg, ${t.bgTo}, #05081A 60%)` }}>
      <GameJsonLd game={game} />
      <GameHero game={game} />

      <Section>
        <SectionHeading eyebrow="Features" title="A storybook adventure, one match at a time" />
        <FeatureGrid features={game.features} accent={t.accent} />
        <Reveal className="mt-10 flex flex-wrap items-center gap-3">
          <span className="eyebrow mr-2">Elements</span>
          {elements.map((e) => (
            <span key={e.name} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm">
              <span className="size-3 rounded-full" style={{ background: e.hex, boxShadow: `0 0 10px ${e.hex}` }} />
              {e.name}
            </span>
          ))}
        </Reveal>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="Guardians" title="Three allies, three Arts" />
        <ul className="grid gap-6 md:grid-cols-3">
          {guardians.map((g, i) => (
            <li key={g.name}>
              <Reveal delay={i * 0.06} className="h-full">
                <article className="glow-card h-full overflow-hidden" style={{ '--glow': g.colour } as React.CSSProperties}>
                <GameArt
                  src={g.image}
                  alt={`${g.name}, ${g.role}`}
                  from={t.bgFrom}
                  to={t.bgTo}
                  glow={g.colour}
                  fit="contain"
                  className="aspect-[240/538] w-full bg-black/40"
                  sizes="(min-width: 768px) 33vw, 100vw"
                />
                <div className="flex flex-col gap-1 p-6">
                  <p className="eyebrow" style={{ color: g.colour }}>
                    {g.role}
                  </p>
                  <h3 className="heading text-2xl">{g.name}</h3>
                  <p className="text-muted">
                    Art: <span className="font-bold text-foreground">{g.art}</span>
                  </p>
                </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="Screenshots" title="A look inside Aurelith" />
        <Gallery items={galleryItems(game, assetExists)} colours={{ from: t.bgFrom, to: t.bgTo, glow: t.glow }} />
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="How to play" title="Easy to learn, three steps" center />
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Reveal delay={i * 0.06} className="glass-card flex h-full flex-col gap-3 p-6">
                <span className="heading text-3xl" style={{ color: t.accent }}>
                  {i + 1}
                </span>
                <h3 className="heading text-xl">{s.title}</h3>
                <p className="leading-relaxed text-muted">{s.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
        <Reveal className="glass-card mt-8 flex items-start gap-4 p-6">
          <Smartphone className="mt-1 size-6 shrink-0" style={{ color: t.accent }} aria-hidden="true" />
          <div>
            <h3 className="font-bold">Add it to your home screen</h3>
            <p className="leading-relaxed text-muted">
              On your phone, open the game and choose &quot;Add to Home Screen&quot; from your browser menu. It then opens like an app and works offline.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="FAQ" title="Good questions" center />
        <FaqList items={game.faq} />
      </Section>

      <FinalCta title="The Heartstones are waiting." href={game.playUrl} label={game.playLabel} accent={t.accent} />
    </div>
  )
}
