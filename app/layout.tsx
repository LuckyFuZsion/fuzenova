import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cinzel, Nunito } from 'next/font/google'
import { Toaster } from 'sonner'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
import { site } from '@/lib/site'
import './globals.css'

const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', display: 'swap' })
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: 'FuzeNova Games | Elemental worlds, forged in your browser', template: '%s | FuzeNova Games' },
  description: 'Free browser games from FuzeNova Games, a one-person UK indie studio. No download, no install, saves that follow you.',
  manifest: '/site.webmanifest',
  openGraph: { type: 'website', siteName: 'FuzeNova Games', locale: 'en_GB' },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#05081A' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${cinzel.variable} ${nunito.variable} bg-background`}>
      <body className="min-h-screen font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-dawn focus:px-4 focus:py-2 focus:text-void">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <Toaster theme="dark" position="bottom-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
