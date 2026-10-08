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
  // A field real visitors never see or fill in. Bots usually do.
  website: z.string().optional(),
})

/** Emails a contact-form message to us. Only called from the site's own contact page. */
export async function POST(req: Request) {
  const reply = (body: object, status = 200) => NextResponse.json(body, { status })

  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return reply({ error: 'unavailable' }, 503)

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return reply({ error: 'invalid' }, 400)
  const m = parsed.data

  // Looks like a bot: say thanks and quietly drop it.
  if (m.website) return reply({ ok: true })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!allow(`contact-ip:${ip}`, 5, 10 * 60_000) || !allow(`contact-email:${m.email.toLowerCase()}`, 3, 3600_000)) {
    return reply({ error: 'rate-limited' }, 429)
  }

  try {
    await sendContactEmail(m)
    return reply({ ok: true })
  } catch (e) {
    console.error('contact send failed:', e instanceof Error ? e.message : e)
    return reply({ error: 'failed' }, 500)
  }
}
