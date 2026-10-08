import 'server-only'
import { site } from '@/lib/site'

// Pages allowed to call the auth-mail endpoints: this site, the same games hosted on luckyfuzsion.com,
// and local dev servers.
const extra = ['https://fuzenova.dev', 'https://www.fuzenova.dev', 'https://luckyfuzsion.com', 'https://www.luckyfuzsion.com']
const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

export function corsHeaders(origin: string | null): Record<string, string> {
  const own = new URL(site.url).origin
  const ok = origin && (origin === own || extra.includes(origin) || local.test(origin))
  return {
    ...(ok ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  }
}
