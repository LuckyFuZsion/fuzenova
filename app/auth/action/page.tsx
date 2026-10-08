import type { Metadata } from 'next'
import { AuthAction } from '@/components/site/auth-action'
import { games } from '@/lib/games'

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
}

type Search = { mode?: string; oobCode?: string; game?: string }

export default async function AuthActionPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { mode, oobCode, game } = await searchParams
  // Only a known game can be linked back to, so this page cannot be used to send people elsewhere.
  const target = games.find((g) => g.slug === game)
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl items-center px-5 py-20 md:py-28">
      <AuthAction
        mode={mode === 'verifyEmail' || mode === 'resetPassword' ? mode : null}
        code={typeof oobCode === 'string' ? oobCode : ''}
        game={target ? { title: target.title, href: target.playUrl, accent: target.theme.accent } : null}
      />
    </section>
  )
}
