import { NextResponse } from 'next/server'
import { createActionCode, mailConfigured, userByEmail } from '@/lib/server/firebase-admin'
import { corsHeaders } from '@/lib/server/cors'
import { actionUrl, cleanGame, sendResetEmail } from '@/lib/server/mail'
import { allow } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

/**
 * Emails a password-reset link. Always answers the same way whether or not the address has an account,
 * so it cannot be used to find out who has one.
 */
export async function POST(req: Request) {
  const headers = corsHeaders(req.headers.get('origin'))
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers })

  if (!mailConfigured()) return reply({ error: 'unavailable' }, 503)

  const body = (await req.json().catch(() => ({}))) as { email?: unknown; game?: unknown }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return reply({ error: 'invalid-email' }, 400)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!allow(`reset-ip:${ip}`, 8, 10 * 60_000) || !allow(`reset:${email}`, 1, 60_000) || !allow(`reset-day:${email}`, 6, 24 * 3600_000)) {
    return reply({ error: 'rate-limited' }, 429)
  }

  const game = cleanGame(body.game)
  try {
    const user = await userByEmail(email)
    if (user) {
      const code = await createActionCode('PASSWORD_RESET', email)
      await sendResetEmail(email, actionUrl('resetPassword', code, game), game)
    }
  } catch (e) {
    // Logged for us, but the player gets the same answer as for an unknown address.
    console.error('send-reset failed:', e instanceof Error ? e.message : e)
  }
  return reply({ ok: true })
}
