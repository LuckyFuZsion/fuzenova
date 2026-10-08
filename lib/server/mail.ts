import 'server-only'
import { site } from '@/lib/site'

export const GAME_NAMES: Record<string, string> = {
  'crystalbound-saga': 'Crystalbound Saga',
  'cinder-automata': 'Cinder Automata',
}

/** Only known game slugs are accepted, so links can never be pointed at another site. */
export const cleanGame = (g: unknown): string | null => (typeof g === 'string' && g in GAME_NAMES ? g : null)

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

type Content = { preheader: string; heading: string; paragraphs: string[]; button: string; url: string; footnote: string }

function render(c: Content) {
  const logo = `${site.url}/images/brand/email-logo.png`
  const paras = c.paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#d8dcf5;">${esc(p)}</p>`).join('')
  const html = `<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#05081A;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05081A;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0B1030;border:1px solid #232a5c;border-radius:16px;">
<tr><td align="center" style="padding:32px 32px 8px;"><img src="${logo}" width="130" alt="FuzeNova Games" style="display:block;border:0;height:auto;"></td></tr>
<tr><td style="padding:16px 32px 32px;font-family:Segoe UI,Arial,sans-serif;">
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#FFE27A;text-align:center;">${esc(c.heading)}</h1>
${paras}
<p style="margin:24px 0;text-align:center;"><a href="${c.url}" style="display:inline-block;background:#FFE27A;color:#1a1205;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:999px;">${esc(c.button)}</a></p>
<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#8d93c4;">If the button does not work, copy this address into your browser:<br><a href="${c.url}" style="color:#8fd8ff;word-break:break-all;">${esc(c.url)}</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#8d93c4;">${esc(c.footnote)}</p>
</td></tr></table>
<p style="margin:16px 0 0;font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:#6b7199;">FuzeNova Games &middot; free games in your browser</p>
</td></tr></table></body></html>`
  const text = [c.heading, '', ...c.paragraphs, '', `${c.button}: ${c.url}`, '', c.footnote, '', 'FuzeNova Games'].join('\n')
  return { html, text }
}

async function send(to: string, subject: string, content: Content) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM
  if (!key || !from) throw new Error('RESEND_API_KEY or MAIL_FROM is not set')
  const { html, text } = render(content)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  })
  if (!res.ok) throw new Error(`Resend returned ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

export function sendVerificationEmail(to: string, name: string, url: string, game: string | null) {
  const where = game ? ` ${GAME_NAMES[game]}` : ' your games'
  return send(to, 'Confirm your FuzeNova account', {
    preheader: 'One tap to confirm your email address.',
    heading: 'Confirm your email',
    paragraphs: [`Hello ${name || 'there'},`, `Welcome to FuzeNova Games! Confirm your email address to start saving your progress in${where}.`],
    button: 'Confirm my email',
    url,
    footnote: 'If you did not create an account, you can safely ignore this email.',
  })
}

export function sendResetEmail(to: string, url: string, game: string | null) {
  const where = game ? ` for ${GAME_NAMES[game]}` : ''
  return send(to, 'Reset your FuzeNova password', {
    preheader: 'Choose a new password for your account.',
    heading: 'Reset your password',
    paragraphs: [`We got a request to reset the password${where} on your FuzeNova account.`, 'Choose a new password with the button below. The link works once and expires after an hour.'],
    button: 'Choose a new password',
    url,
    footnote: 'If you did not ask for this, you can ignore this email. Your password has not changed.',
  })
}

/** Builds the link on our own site from the one-time code Firebase made, so players never see a firebaseapp.com address. */
export function actionUrl(mode: 'verifyEmail' | 'resetPassword', firebaseLink: string, game: string | null) {
  const code = new URL(firebaseLink).searchParams.get('oobCode')
  if (!code) throw new Error('Firebase link had no code')
  const u = new URL('/auth/action', site.url)
  u.searchParams.set('mode', mode)
  u.searchParams.set('oobCode', code)
  if (game) u.searchParams.set('game', game)
  return u.toString()
}
