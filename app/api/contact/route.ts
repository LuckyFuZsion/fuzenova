import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendContactEmail } from '@/lib/server/mail'
import { allow } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'

const topics = ['General', 'Bug report', 'Press', 'Collaboration'] as const

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(120),
  topic: z.enum(topics),
  message: z.string().trim().min(10).max(2000),
  // `hp` is a hidden field real visitors never see. `website` is what an older version of the page called it.
  hp: z.string().max(500).optional(),
  website: z.string().max(500).optional(),
  // How long (ms) the form had been on screen when it was sent.
  t: z.number().finite().optional(),
})

/** Emails a contact-form message to us. Only called from the site's own contact page. */
export async function POST(req: Request) {
  const reply = (body: object, status = 200) => NextResponse.json(body, { status })

  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return reply({ error: 'unavailable' }, 503)

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return reply({ error: 'invalid' }, 400)
  const m = parsed.data

  // Spam checks. Browser autofill can fill a hidden field by accident, so a filled trap alone must never lose a real
  // message. Drop quietly only when it also looks automated (sent within moments of the page loading, or with no
  // timing at all); otherwise deliver it, marked, so a person can judge.
  // (Pages that were already open before this change still call the trap "website" and send no timing. That field is
  // the one autofill was filling, so those messages are delivered, marked, and never dropped.)
  const trapFilled = Boolean(m.hp || m.website)
  const sentInstantly = m.t !== undefined && m.t < 1500
  const looksAutomated = Boolean(m.hp) && (m.t === undefined || m.t < 4000)
  if (sentInstantly || looksAutomated) return reply({ ok: true })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!allow(`contact-ip:${ip}`, 5, 10 * 60_000) || !allow(`contact-email:${m.email.toLowerCase()}`, 3, 3600_000)) {
    return reply({ error: 'rate-limited' }, 429)
  }

  try {
    await sendContactEmail({ name: m.name, email: m.email, topic: m.topic, message: m.message, flagged: trapFilled })
    return reply({ ok: true })
  } catch (e) {
    console.error('contact send failed:', e instanceof Error ? e.message : e)
    return reply({ error: 'failed' }, 500)
  }
}
