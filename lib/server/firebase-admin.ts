import 'server-only'
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function readServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set')
  // Accept the JSON as-is, or base64 of it (handy when a host mangles the newlines).
  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
  return JSON.parse(json) as ServiceAccount
}

export const mailConfigured = () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT && process.env.RESEND_API_KEY && process.env.MAIL_FROM)

export function adminAuth() {
  const app = getApps()[0] ?? initializeApp({ credential: cert(readServiceAccount()) })
  return getAuth(app)
}
