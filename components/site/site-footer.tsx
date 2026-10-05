import Link from 'next/link'
import { games } from '@/lib/games'
import { nav, site } from '@/lib/site'
import { Divider } from './divider'
import { Wordmark } from './emblem'

export function SiteFooter() {
  return (
    <footer className="bg-deep">
      <Divider />
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[1.5fr_1fr_1fr] md:px-8">
        <div className="flex flex-col gap-4">
          <Wordmark />
          <p className="max-w-xs text-muted">{site.line}</p>
          <p className="text-sm text-muted">All our games are free to play in your browser.</p>
        </div>
        <FooterColumn title="Games">
          {games.map((g) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="footer-link">
              {g.title}
            </Link>
          ))}
        </FooterColumn>
        <FooterColumn title="Studio">
          {nav.slice(1).map((n) => (
            <Link key={n.href} href={n.href} className="footer-link">
              {n.label}
            </Link>
          ))}
        </FooterColumn>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>Made in the UK · © {new Date().getFullYear()} FuzeNova Games</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-dawn">
              Privacy
            </Link>
            <Link href="/privacy#cookies" className="hover:text-dawn">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </div>
  )
}
