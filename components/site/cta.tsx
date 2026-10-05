import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Reveal } from './reveal'

export function ContactBanner({
  title = 'Got feedback?',
  body = 'Found a bug or have an idea? Drop a message and the person making the games will read it.',
}: {
  title?: string
  body?: string
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
      <Reveal className="nova-banner flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-12">
        <div className="relative flex max-w-xl flex-col gap-3">
          <h2 className="heading text-3xl text-balance md:text-4xl">{title}</h2>
          <p className="leading-relaxed text-muted">{body}</p>
        </div>
        <Link href="/contact" className="btn btn-gold relative">
          Get in touch <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Reveal>
    </section>
  )
}

export function FinalCta({ title, href, label, accent }: { title: string; href: string; label: string; accent: string }) {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-28 text-center md:px-8">
      <Reveal className="flex flex-col items-center gap-6">
        <h2 className="heading text-3xl text-balance md:text-5xl">{title}</h2>
        <p className="text-muted">Free, in your browser, right now.</p>
        <a href={href} className="btn btn-gold" style={{ boxShadow: `0 0 40px ${accent}55` }}>
          {label} <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </Reveal>
    </section>
  )
}
