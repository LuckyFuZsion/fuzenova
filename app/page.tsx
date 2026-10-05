import { ArrowRight, Cloud, Laptop, Smartphone } from 'lucide-react'
import Link from 'next/link'
import { Divider } from '@/components/site/divider'
import { ContactBanner } from '@/components/site/cta'
import { GameCard } from '@/components/site/game-card'
import { HomeHero } from '@/components/site/home-hero'
import { PostCard } from '@/components/site/post-card'
import { Eyebrow, Section, SectionHeading } from '@/components/site/primitives'
import { Reveal } from '@/components/site/reveal'
import { posts } from '@/lib/devlog'
import { getGame } from '@/lib/games'

export default function HomePage() {
  const crystal = getGame('crystalbound-saga')
  const cinder = getGame('cinder-automata')

  return (
    <>
      <HomeHero />
      <Divider />

      <Section>
        <SectionHeading
          eyebrow="Featured games"
          title="Two worlds, ready when you are"
          action={
            <Link href="/games" className="btn btn-outline self-start">
              All games <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <GameCard game={crystal} size="lg" />
          </Reveal>
          <Reveal delay={0.08}>
            <GameCard game={cinder} size="lg" />
          </Reveal>
        </div>
      </Section>

      <section className="bg-deep">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-2">
          <Reveal className="flex flex-col gap-5">
            <Eyebrow>FuzeNova account</Eyebrow>
            <h2 className="heading text-3xl text-balance md:text-5xl">One account, every world</h2>
            <p className="text-lg leading-relaxed text-muted">
              Sign up once with an email and password. Your saves sync between every FuzeNova game and every device you play on.
            </p>
            <p className="leading-relaxed text-muted">
              Start a level on your phone on the bus, finish it on your laptop at home. Prefer not to sign up? Your games still save on your device.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <SyncDiagram />
          </Reveal>
        </div>
      </section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading
          eyebrow="Devlog"
          title="Latest from the workshop"
          action={
            <Link href="/devlog" className="btn btn-outline self-start">
              All posts <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
        <ul className="grid gap-6 md:grid-cols-3">
          {posts.slice(0, 3).map((p, i) => (
            <li key={p.slug}>
              <Reveal delay={i * 0.06} className="h-full">
                <PostCard post={p} />
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="pt-0 md:pt-0">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <Eyebrow>The studio</Eyebrow>
          <h2 className="heading text-3xl text-balance md:text-4xl">A one-person studio in the UK</h2>
          <p className="text-lg leading-relaxed text-pretty text-muted">
            FuzeNova is Steve. He designs and codes every game himself, makes the art and audio with AI-assisted tools, then tunes it all by hand until it feels right.
          </p>
          <Link href="/studio" className="btn btn-outline">
            Meet the studio <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </Section>

      <ContactBanner />
    </>
  )
}

function SyncDiagram() {
  return (
    <figure className="glass-card relative flex flex-col items-center gap-8 p-8 md:p-12" aria-label="Saves sync between your phone, laptop and the cloud">
      <div className="flex size-24 items-center justify-center rounded-full border border-dawn/40 bg-dawn/10 text-dawn shadow-[0_0_50px_rgba(255,226,122,0.25)]">
        <Cloud className="size-10" aria-hidden="true" />
      </div>
      <div className="flex w-full max-w-sm justify-between" aria-hidden="true">
        <span className="h-12 w-px origin-bottom rotate-[35deg] bg-gradient-to-t from-tide to-dawn" />
        <span className="h-12 w-px origin-bottom -rotate-[35deg] bg-gradient-to-t from-storm to-dawn" />
      </div>
      <div className="flex w-full max-w-sm justify-between">
        <Device icon={<Smartphone className="size-7" aria-hidden="true" />} label="Phone" colour="text-tide border-tide/40" />
        <Device icon={<Laptop className="size-7" aria-hidden="true" />} label="Laptop" colour="text-storm border-storm/40" />
      </div>
      <figcaption className="text-center text-sm text-muted">Progress saved on each device and synced through your account.</figcaption>
    </figure>
  )
}

function Device({ icon, label, colour }: { icon: React.ReactNode; label: string; colour: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex size-16 items-center justify-center rounded-2xl border bg-void ${colour}`}>{icon}</div>
      <span className="text-sm font-bold">{label}</span>
    </div>
  )
}
