import { ArrowRight, Cloud } from 'lucide-react'
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
    <figure className="glass-card relative overflow-hidden p-6 md:p-8" aria-label="Saves sync between your phone, laptop and the cloud">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,226,122,0.16),transparent)]" aria-hidden="true" />
      <div className="relative mx-auto aspect-[520/470] w-full max-w-md">
        <svg viewBox="0 0 520 470" className="absolute inset-0 size-full" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="sync-l" x1="260" y1="138" x2="105" y2="212" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFE27A" />
              <stop offset="1" stopColor="#2EC8FF" />
            </linearGradient>
            <linearGradient id="sync-r" x1="260" y1="138" x2="415" y2="296" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFE27A" />
              <stop offset="1" stopColor="#A45CFF" />
            </linearGradient>
          </defs>
          <path id="sync-path-l" d="M260 138 C260 190 105 150 105 212" stroke="url(#sync-l)" strokeWidth="3" strokeDasharray="1 8" strokeLinecap="round" />
          <path id="sync-path-r" d="M260 138 C260 240 415 190 415 296" stroke="url(#sync-r)" strokeWidth="3" strokeDasharray="1 8" strokeLinecap="round" />
          <g className="motion-reduce:hidden">
            <circle r="5" fill="#FFE27A">
              <animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#sync-path-l" /></animateMotion>
            </circle>
            <circle r="5" fill="#FFE27A">
              <animateMotion dur="3.2s" begin="1.6s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#sync-path-l" /></animateMotion>
            </circle>
            <circle r="5" fill="#FFE27A">
              <animateMotion dur="3.2s" begin="0.8s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#sync-path-r" /></animateMotion>
            </circle>
            <circle r="5" fill="#FFE27A">
              <animateMotion dur="3.2s" begin="2.4s" repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear"><mpath href="#sync-path-r" /></animateMotion>
            </circle>
          </g>
        </svg>

        {/* Cloud / account */}
        <div className="absolute top-0 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 sm:gap-2">
          <div className="flex size-14 items-center justify-center rounded-full border border-dawn/50 sm:size-20 bg-void text-dawn shadow-[0_0_50px_rgba(255,226,122,0.3)]">
            <Cloud className="size-6 sm:size-9" aria-hidden="true" />
          </div>
          <span className="text-[10px] font-bold tracking-widest whitespace-nowrap text-dawn uppercase sm:text-xs">FuzeNova account</span>
        </div>

        {/* Phone showing Crystalbound */}
        <div className="absolute bottom-0 left-[20.2%] flex w-[26%] -translate-x-1/2 flex-col items-center gap-2">
          <div className="aspect-[9/17] w-full overflow-hidden rounded-[18px] border-2 border-tide/60 bg-black p-[3px] shadow-[0_0_30px_rgba(46,200,255,0.25)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/play/crystalbound-saga/assets/story/ch2-intro.webp" alt="" className="size-full rounded-[14px] object-cover" />
          </div>
          <span className="text-sm font-bold">Phone</span>
        </div>

        {/* Laptop showing Cinder Automata */}
        <div className="absolute bottom-0 left-[79.8%] flex w-[40%] -translate-x-1/2 flex-col items-center gap-2">
          <div className="w-full">
            <div className="aspect-[16/10] w-full overflow-hidden rounded-t-lg border-2 border-b-0 border-storm/60 bg-black p-[3px] shadow-[0_0_30px_rgba(164,92,255,0.25)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/games/cinder/shot-3.webp" alt="" className="size-full rounded-t-[5px] object-cover" />
            </div>
            <div className="mx-[-6%] h-2 rounded-b-xl border border-storm/40 bg-gradient-to-b from-[#2a2f55] to-[#14183a]" />
          </div>
          <span className="text-sm font-bold">Laptop</span>
        </div>
      </div>
      <figcaption className="relative mt-6 text-center text-sm text-muted">Progress saved on each device and synced through your account.</figcaption>
    </figure>
  )
}
