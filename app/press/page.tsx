import { Mail } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CopySwatch } from '@/components/site/copy-swatch'
import { Emblem, Wordmark } from '@/components/site/emblem'
import { PageIntro, Section, SectionHeading } from '@/components/site/primitives'
import { games } from '@/lib/games'
import { site } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Press kit',
  description: 'Facts, descriptions, logos and brand colours for FuzeNova Games.',
  alternates: { canonical: '/press' },
}

const facts = [
  ['Developer', 'FuzeNova Games (Steve)'],
  ['Based in', 'United Kingdom'],
  ['Team size', '1'],
  ['Platforms', 'Web browser (phone and desktop)'],
  ['Price', 'Free'],
  ['Contact', site.pressEmail],
]

const brand = [
  { name: 'Void', hex: '#05081A' },
  { name: 'Dawn gold', hex: '#FFE27A' },
  { name: 'Ember', hex: '#FF7A2A' },
  { name: 'Tide', hex: '#2AC8FF' },
  { name: 'Storm', hex: '#A45CFF' },
]

export default function PressPage() {
  return (
    <>
      <PageIntro eyebrow="Press kit" title="Everything you need to write about us" intro="Free to use in coverage. If you need anything else, just ask." />
      <Section className="pt-4 md:pt-4">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <dl className="glass-card grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 self-start p-6">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-6">
            <h2 className="heading text-2xl">About the studio</h2>
            <p className="leading-relaxed text-muted">
              FuzeNova Games is a one-person indie studio in the UK making free, elemental browser games. Every game runs on phone and desktop with no download, and one account syncs saves across every title.
            </p>
            <a href={`mailto:${site.pressEmail}`} className="btn btn-gold self-start">
              <Mail className="size-4" aria-hidden="true" /> Email for press
            </a>
          </div>
        </div>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="Games" title="Descriptions" />
        <ul className="flex flex-col gap-4">
          {games.map((g) => (
            <li key={g.slug} className="glass-card flex flex-col gap-2 p-6">
              <h3 className="heading text-xl">
                <Link href={`/games/${g.slug}`} className="hover:text-dawn">
                  {g.title}
                </Link>
              </h3>
              <p className="text-sm text-muted">
                {g.genre} · {g.status}
              </p>
              <p className="leading-relaxed">{g.longDescription}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="pt-0 md:pt-0">
        <SectionHeading eyebrow="Brand" title="Logo and colours" intro="Click a swatch to copy its hex value." />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-card flex items-center justify-center gap-6 p-10">
            <Emblem className="size-16" />
            <Wordmark className="text-3xl" />
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {brand.map((c) => (
              <li key={c.hex}>
                <CopySwatch name={c.name} hex={c.hex} />
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  )
}
