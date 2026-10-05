import { Brush, Code2, Music, SlidersHorizontal } from 'lucide-react'
import type { Metadata } from 'next'
import { ContactBanner } from '@/components/site/cta'
import { PageIntro, Section, SectionHeading } from '@/components/site/primitives'
import { Reveal } from '@/components/site/reveal'

export const metadata: Metadata = {
  title: 'Studio',
  description: 'FuzeNova Games is a one-person indie studio in the UK, run by Steve.',
  alternates: { canonical: '/studio' },
}

const craft = [
  { icon: Code2, title: 'Design and code', body: 'Every system, level and line of game code is written by hand.' },
  { icon: Brush, title: 'Art', body: 'Made with AI-assisted tools, then cleaned up, recoloured and composed so each world has its own look.' },
  { icon: Music, title: 'Audio', body: 'Music and effects are generated with AI-assisted tools, then edited and mixed to fit the game.' },
  { icon: SlidersHorizontal, title: 'Tuning', body: 'The part that takes longest. Feel, pacing and difficulty are tuned by playing, over and over.' },
]

const values = [
  { title: 'Free and open', body: 'No paywalls on the fun. Every game plays in a browser without installing anything.' },
  { title: 'Respect your time', body: 'Short sessions that still feel like progress, and saves you can trust.' },
  { title: 'Built in the open', body: 'Early builds go to playtesters first. Players shape what ships.' },
]

export default function StudioPage() {
  return (
    <>
      <PageIntro
        eyebrow="The studio"
        title="Hello, I am Steve"
        intro="FuzeNova Games is a one-person studio in the UK. I make bright, elemental games that load in a browser tab and are easy to pick up on any device."
      />
      <Section className="pt-4 md:pt-4">
        <SectionHeading eyebrow="How the games are made" title="Hand-built, AI-assisted" />
        <ul className="grid gap-4 sm:grid-cols-2">
          {craft.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <Reveal delay={(i % 2) * 0.06} className="glass-card flex h-full gap-5 p-6">
                <Icon className="mt-1 size-6 shrink-0 text-dawn" aria-hidden="true" />
                <div>
                  <h3 className="heading mb-2 text-lg">{title}</h3>
                  <p className="leading-relaxed text-muted">{body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>
      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="What matters" title="Three promises" />
        <ul className="grid gap-6 md:grid-cols-3">
          {values.map((v, i) => (
            <li key={v.title}>
              <Reveal delay={i * 0.06} className="flex flex-col gap-2 border-t border-line pt-6">
                <h3 className="heading text-xl">{v.title}</h3>
                <p className="leading-relaxed text-muted">{v.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>
      <ContactBanner title="Say hello" />
    </>
  )
}
