import 'server-only'
import { createSign } from 'node:crypto'
import { FIREBASE_CONFIG } from '@/lib/firebase-config'

// A small client for Google's Identity Toolkit REST API, using the "fuzenova-mailer" service account.
// It replaces the firebase-admin package, whose dependencies fail to load on our host.

type ServiceAccount = { client_email: string; private_key: string; project_id: string }

function readServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set')
  // Accept the JSON as-is, or base64 of it (handy when a host mangles the newlines).
  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
  const sa = JSON.parse(json) as ServiceAccount
  if (!sa.client_email || !sa.private_key || !sa.project_id) throw new Error('FIREBASE_SERVICE_ACCOUNT is missing fields')
  return sa
}

export const mailConfigured = () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT && process.env.RESEND_API_KEY && process.env.MAIL_FROM)

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url')

let cached: { token: string; expires: number } | null = null

/** A short-lived Google access token for the service account (signed JWT exchanged at Google's token endpoint). */
async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(signature)}` }),
  })
  if (!res.ok) throw new Error(`Google token request failed (${res.status})`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 }
  return cached.token
}

export type AuthUser = { uid: string; email: string; emailVerified: boolean; displayName: string }

type RawUser = { localId: string; email?: string; emailVerified?: boolean; displayName?: string }

const toUser = (u: RawUser): AuthUser => ({
  uid: u.localId,
  email: u.email ?? '',
  emailVerified: Boolean(u.emailVerified),
  displayName: u.displayName ?? '',
})

export class BadTokenError extends Error {}

/** Checks a player's sign-in token with Google and returns who it belongs to. Throws BadTokenError if it is not valid. */
export async function userFromIdToken(idToken: string): Promise<AuthUser> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (res.status === 400 || res.status === 401) throw new BadTokenError('invalid token')
  if (!res.ok) throw new Error(`accounts:lookup failed (${res.status})`)
  const json = (await res.json()) as { users?: RawUser[] }
  if (!json.users?.[0]) throw new BadTokenError('no such user')
  return toUser(json.users[0])
}

/** Finds an account by email address, or null if there is none. */
export async function userByEmail(email: string): Promise<AuthUser | null> {
  const sa = readServiceAccount()
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken(sa)}` },
    body: JSON.stringify({ email: [email] }),
  })
  if (!res.ok) throw new Error(`accounts:lookup (admin) failed (${res.status})`)
  const json = (await res.json()) as { users?: RawUser[] }
  return json.users?.[0] ? toUser(json.users[0]) : null
}

/** Creates a one-time code for confirming an email or resetting a password. We email it ourselves instead of Firebase doing so. */
export async function createActionCode(kind: 'VERIFY_EMAIL' | 'PASSWORD_RESET', email: string): Promise<string> {
  const sa = readServiceAccount()
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:sendOobCode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken(sa)}` },
    body: JSON.stringify({ requestType: kind, email, returnOobLink: true }),
  })
  if (!res.ok) throw new Error(`accounts:sendOobCode failed (${res.status})`)
  const json = (await res.json()) as { oobCode?: string; oobLink?: string }
  const code = json.oobCode ?? (json.oobLink ? new URL(json.oobLink).searchParams.get('oobCode') : null)
  if (!code) throw new Error('Google returned no action code')
  return code
}
