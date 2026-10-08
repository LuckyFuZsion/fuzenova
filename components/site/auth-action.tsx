'use client'

import { ArrowRight, CheckCircle2, Loader2, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { FIREBASE_CONFIG } from '@/lib/firebase-config'

type Game = { title: string; href: string; accent: string } | null
type Props = { mode: 'verifyEmail' | 'resetPassword' | null; code: string; game: Game }
type State = 'working' | 'verified' | 'ask-password' | 'reset-done' | 'bad-link' | 'error'

async function getAuthSdk() {
  const [{ getApps, initializeApp }, auth] = await Promise.all([import('firebase/app'), import('firebase/auth')])
  const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG)
  return { auth: auth.getAuth(app), sdk: auth }
}

export function AuthAction({ mode, code, game }: Props) {
  const [state, setState] = useState<State>(mode && code ? 'working' : 'bad-link')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (!mode || !code || started.current) return
    started.current = true
    ;(async () => {
      try {
        const { auth, sdk } = await getAuthSdk()
        if (mode === 'verifyEmail') {
          await sdk.applyActionCode(auth, code)
          setState('verified')
        } else {
          setEmail(await sdk.verifyPasswordResetCode(auth, code))
          setState('ask-password')
        }
      } catch (e) {
        const c = (e as { code?: string })?.code ?? ''
        setState(c === 'auth/expired-action-code' || c === 'auth/invalid-action-code' ? 'bad-link' : 'error')
      }
    })()
  }, [mode, code])

  async function submitPassword(ev: React.FormEvent) {
    ev.preventDefault()
    setFormError('')
    if (password.length < 6) return setFormError('Password must be at least 6 characters.')
    if (password !== confirm) return setFormError('The two passwords do not match.')
    setBusy(true)
    try {
      const { auth, sdk } = await getAuthSdk()
      await sdk.confirmPasswordReset(auth, code, password)
      setState('reset-done')
    } catch (e) {
      const c = (e as { code?: string })?.code ?? ''
      if (c === 'auth/weak-password') setFormError('Please choose a stronger password.')
      else if (c === 'auth/expired-action-code' || c === 'auth/invalid-action-code') setState('bad-link')
      else setFormError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const back = game ? (
    <a href={game.href} className="btn btn-gold" style={{ background: game.accent }}>
      Back to {game.title} <ArrowRight className="size-4" aria-hidden="true" />
    </a>
  ) : (
    <Link href="/games" className="btn btn-gold">
      Choose a game <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  )

  return (
    <div className="glass-card w-full p-8 text-center md:p-10" aria-live="polite">
      {state === 'working' && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-dawn" aria-hidden="true" />
          <p className="text-muted">One moment...</p>
        </div>
      )}

      {state === 'verified' && (
        <div className="flex flex-col items-center gap-5">
          <CheckCircle2 className="size-12 text-dawn" aria-hidden="true" />
          <h1 className="heading text-3xl">Email confirmed</h1>
          <p className="text-muted">Thanks! Your account is ready. Head back to the game and carry on. If it is still open in another tab, it will pick this up in a moment.</p>
          {back}
        </div>
      )}

      {state === 'ask-password' && (
        <form onSubmit={submitPassword} className="flex flex-col gap-4 text-left">
          <h1 className="heading text-center text-3xl">Choose a new password</h1>
          <p className="text-center text-muted">For {email}</p>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-line bg-void px-4 py-3 text-base font-normal outline-none focus:border-dawn"
              required
              minLength={6}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Repeat it
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-xl border border-line bg-void px-4 py-3 text-base font-normal outline-none focus:border-dawn"
              required
              minLength={6}
            />
          </label>
          {formError && (
            <p role="alert" className="text-sm text-[#ff8a7a]">
              {formError}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn btn-gold justify-center disabled:opacity-60">
            {busy ? 'Saving...' : 'Save new password'}
          </button>
        </form>
      )}

      {state === 'reset-done' && (
        <div className="flex flex-col items-center gap-5">
          <CheckCircle2 className="size-12 text-dawn" aria-hidden="true" />
          <h1 className="heading text-3xl">Password changed</h1>
          <p className="text-muted">You can now sign in with your new password.</p>
          {back}
        </div>
      )}

      {(state === 'bad-link' || state === 'error') && (
        <div className="flex flex-col items-center gap-5">
          <TriangleAlert className="size-12 text-[#ff8a7a]" aria-hidden="true" />
          <h1 className="heading text-3xl">{state === 'bad-link' ? 'This link has expired' : 'Something went wrong'}</h1>
          <p className="text-muted">
            {state === 'bad-link'
              ? 'Links like this work once and run out after a while. Open the game and ask for a fresh email.'
              : 'We could not finish that just now. Please try again in a moment, or ask for a fresh email from the game.'}
          </p>
          {back}
        </div>
      )}
    </div>
  )
}
