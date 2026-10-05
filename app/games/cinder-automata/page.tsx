import type { Metadata } from 'next'
import Link from 'next/link'
import { FinalCta } from '@/components/site/cta'
import { GameArt } from '@/components/site/game-art'
import { GameHero, galleryItems } from '@/components/site/game-hero'
import { GameJsonLd } from '@/components/site/game-json-ld'
import { Gallery } from '@/components/site/gallery'
import { FaqList, FeatureGrid, Section, SectionHeading } from '@/components/site/primitives'
import { Reveal } from '@/components/site/reveal'
import { assetExists } from '@/lib/assets'
import { cinderBosses, cinderCommanders, cinderLoop, cinderPillars, getGame } from '@/lib/games'

const game = getGame('cinder-automata')

export const metadata: Metadata = {
  title: `${game.title}: ${game.tagline}`,
  description: game.shortDescription,
  alternates: { canonical: `/games/${game.slug}` },
  openGraph: { title: game.title, description: game.shortDescription, images: [game.keyart] },
}

export default function CinderPage() {
  const t = game.theme
  return (
    <div className="blueprint relative" style={{ backgroundColor: t.bgTo }}>
      <GameJsonLd game={game} />
      <GameHero game={game} note="Desktop recommended">
        <div className="ash" aria-hidden="true" />
      </GameHero>

      <Section>
        <SectionHeading eyebrow="Design pillars" title="What it is built around" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cinderPillars.map((p, i) => (
            <li key={p.title}>
              <Reveal delay={i * 0.05} className="glass-card h-full p-6">
                <h3 className="heading mb-2 text-lg" style={{ color: t.accent }}>
                  {p.title}
                </h3>
                <p className="leading-relaxed text-muted">{p.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="The loop" title="One run, round and round" />
        <ol className="relative flex flex-col gap-4 lg:flex-row lg:gap-0">
          {cinderLoop.map((step, i) => (
            <li key={step} className="relative flex items-center gap-4 lg:flex-1 lg:flex-col lg:text-center">
              <span
                className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border-2 font-bold"
                style={{ borderColor: t.accent, color: t.accent, background: t.bgTo, boxShadow: `0 0 18px ${t.accent}44` }}
              >
                {i + 1}
              </span>
              {i < cinderLoop.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-11 left-5 h-4 w-px lg:top-5 lg:left-1/2 lg:h-px lg:w-full"
                  style={{ background: `${t.accent}66` }}
                />
              )}
              <span className="font-bold lg:px-2 lg:pt-4">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="Features" title="A factory that fights back" />
        <FeatureGrid features={game.features} accent={t.accent} />
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="Bosses" title="Three machines to break" />
        <ul className="grid gap-6 md:grid-cols-3">
          {cinderBosses.map((b, i) => (
            <li key={b.name}>
              <Reveal delay={i * 0.06} className="h-full">
                <article
                  className="glow-card h-full overflow-hidden bg-[#140d0b]"
                  style={{ '--glow': '#FF2A1A', boxShadow: '0 0 40px -20px #FF2A1A' } as React.CSSProperties}
                >
                  <GameArt src={b.image} alt={b.name} from="#2A0F0A" to="#0E0B0A" glow="#FF2A1A" className="aspect-[4/3] w-full" sizes="(min-width: 768px) 33vw, 100vw" />
                  <div className="flex flex-col gap-2 p-6">
                    <p className="eyebrow text-[#ff8a7a]">Level {b.level}</p>
                    <h3 className="heading text-2xl">{b.name}</h3>
                    <p className="leading-relaxed text-muted">{b.body}</p>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-muted">Beat the Hive Queen and Endless mode opens up.</p>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="Commanders" title="Pick who leads the line" intro="Each commander brings a bonus and a drawback. They are on the way." />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cinderCommanders.map((c) => (
            <li key={c.name} className="glass-card flex flex-col gap-2 border-dashed p-6 opacity-90">
              <span className="eyebrow">Coming soon</span>
              <h3 className="heading text-lg">{c.name}</h3>
              <p className="text-muted">{c.focus}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="Screenshots" title="From the prototype" />
        <Gallery items={galleryItems(game, assetExists)} colours={{ from: t.bgFrom, to: t.bgTo, glow: t.accent }} />
      </Section>

      <Section className="pt-0 md:pt-0">
        <Reveal className="glass-card flex flex-col items-start gap-5 p-8 md:flex-row md:items-center md:justify-between md:p-12" >
          <div className="flex max-w-xl flex-col gap-3">
            <h2 className="heading text-3xl text-balance">Help shape it</h2>
            <p className="leading-relaxed text-muted">
              Cinder Automata is being built with its players. Get in touch to playtest new builds, report bugs and argue about balance.
            </p>
          </div>
          <Link href="/contact" className="btn btn-gold" style={{ background: t.accent }}>
            Become a playtester
          </Link>
        </Reveal>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="FAQ" title="Good questions" center />
        <FaqList items={game.faq} />
      </Section>

      <FinalCta title="The machines are coming. Build fast." href={game.playUrl} label={game.playLabel} accent={t.accent} />
    </div>
  )
}
