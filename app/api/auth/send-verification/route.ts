import { NextResponse } from 'next/server'
import { adminAuth, mailConfigured } from '@/lib/server/firebase-admin'
import { corsHeaders } from '@/lib/server/cors'
import { actionUrl, cleanGame, sendVerificationEmail } from '@/lib/server/mail'
import { allow } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

/** Emails a signed-in player their "confirm your email" link, from our own domain. */
export async function POST(req: Request) {
  const headers = corsHeaders(req.headers.get('origin'))
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers })

  if (!mailConfigured()) return reply({ error: 'unavailable' }, 503)

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return reply({ error: 'unauthorised' }, 401)

  try {
    const auth = adminAuth()
    const decoded = await auth.verifyIdToken(token)
    const user = await auth.getUser(decoded.uid)
    if (!user.email) return reply({ error: 'no email on this account' }, 400)
    if (user.emailVerified) return reply({ ok: true, alreadyVerified: true })

    if (!allow(`verify:${user.uid}`, 1, 60_000) || !allow(`verify-day:${user.uid}`, 10, 24 * 3600_000)) {
      return reply({ error: 'rate-limited' }, 429)
    }

    const body = (await req.json().catch(() => ({}))) as { game?: unknown }
    const game = cleanGame(body.game)
    const link = await auth.generateEmailVerificationLink(user.email)
    await sendVerificationEmail(user.email, user.displayName ?? '', actionUrl('verifyEmail', link, game), game)
    return reply({ ok: true })
  } catch (e) {
    console.error('send-verification failed:', e instanceof Error ? e.message : e)
    const badToken = (e as { code?: string })?.code?.startsWith('auth/')
    return reply({ error: badToken ? 'unauthorised' : 'failed' }, badToken ? 401 : 500)
  }
}
