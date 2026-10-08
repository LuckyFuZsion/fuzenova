// Accounts and cloud saves. Sign-in is email + password (Firebase Authentication); each player's run and progress live in one
// Firestore document, cinderSaves/<uid>, that only that player can read or write (see firestore.rules).
// Firebase's code is downloaded from Google's CDN only when the game opens, so it adds nothing to the game's own size.
import { mergePrestige, type PrestigeState } from './sim/prestige';
import { FIREBASE_CONFIG } from './firebase-config';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const firebase: any;

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
export const COLLECTION = 'cinderSaves';
const LAST_USER = 'cinder-automata.lastuser.v1';
const MAX_BYTES = 900_000; // a Firestore document may hold 1 MiB
const UPLOAD_EVERY_MS = 30_000;
let lastSent = ''; // what the cloud already holds (without the save time), so an unchanged game is never uploaded again

/** Everything that belongs to the player's account (the browser keeps a copy; signing out clears it). */
export const SAVE_KEY = 'cinder-automata.save.v1';
const PROFILE_KEYS = {
  unlocks: 'cinder-automata.unlocks.v1',
  progress: 'cinder-automata.progress.v1',
  commander: 'cinder-automata.commander.v1',
  difficulty: 'cinder-automata.difficulty.v1',
  seen: 'cinder-automata.seen.v1',
  prestige: 'cinder-automata.prestige.v1',
} as const;
type ProfileName = keyof typeof PROFILE_KEYS;

export interface CloudUser { uid: string; email: string; name: string; /** has the person clicked the link we emailed them? */ verified: boolean }

let auth: any = null;
let db: any = null;
let sdkP: Promise<void> | null = null;
let user: CloudUser | null = null;
export const currentUser = (): CloudUser | null => user;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`could not load ${src}`));
    document.head.append(s);
  });
}

function loadSdk(): Promise<void> {
  if (!sdkP) {
    sdkP = loadScript(`${SDK}firebase-app-compat.js`)
      .then(() => loadScript(`${SDK}firebase-auth-compat.js`))
      .then(() => loadScript(`${SDK}firebase-firestore-compat.js`))
      .then(() => {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();
        // stay signed in on this device until the player signs out: the sign-in lives in the browser's own storage (it never expires by itself),
        // and the browser is asked not to clear that storage when the device is short of space
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => { /* the default is the same */ });
        try { void navigator.storage?.persist?.(); } catch { /* not supported: fine */ }
      });
    sdkP.catch(() => { sdkP = null; }); // allow a retry
  }
  return sdkP;
}

const toUser = (u: any): CloudUser => ({ uid: u.uid, email: u.email ?? '', name: u.displayName || (u.email ?? '').split('@')[0], verified: !!u.emailVerified });

/** Loads the account service and resolves with whoever is already signed in (or null). Rejects if it cannot be reached. */
export async function initCloud(): Promise<CloudUser | null> {
  await loadSdk();
  return new Promise((resolve) => {
    const off = auth.onAuthStateChanged((u: any) => { off(); user = u ? toUser(u) : null; resolve(user); });
  });
}

/** The account last signed in on this device, used to let someone carry on offline (the save is already in the browser). */
export function lastKnownUser(): CloudUser | null {
  try { const s = localStorage.getItem(LAST_USER); return s ? JSON.parse(s) as CloudUser : null; } catch { return null; }
}
function rememberUser(u: CloudUser | null): void {
  try { if (u) localStorage.setItem(LAST_USER, JSON.stringify(u)); else localStorage.removeItem(LAST_USER); } catch { /* fine */ }
}

// ---- username and password rules (the account service enforces the password length; the rest is for friendliness) ----
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'staff', 'support', 'official', 'luckyfuzsion', 'fuzenova', 'system', 'guest', 'anthropic', 'claude'];
export function checkUsername(raw: string): { name: string } | { error: string } {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length < 3) return { error: 'Username must be at least 3 characters.' };
  if (name.length > 20) return { error: 'Username must be 20 characters or fewer.' };
  if (!/^[A-Za-z0-9 _.\-]+$/.test(name)) return { error: 'Use letters, numbers, spaces, _ . or - only.' };
  if (!/[A-Za-z]/.test(name)) return { error: 'Include at least one letter.' };
  const flat = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (RESERVED.some((r) => flat === r || flat.includes('admin'))) return { error: 'That name is reserved. Choose another.' };
  return { name };
}

// Throwaway-mail services: an address there proves nothing, so new accounts may not use them. (Verification is the real check.)
const DISPOSABLE = ['mailinator.com', '10minutemail.com', '10minutemail.net', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'sharklasers.com', 'grr.la', 'yopmail.com', 'yopmail.net',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'throwawaymail.com', 'trashmail.com', 'trashmail.net', 'getnada.com', 'nada.email', 'maildrop.cc', 'dispostable.com', 'fakeinbox.com',
  'mailnesia.com', 'mintemail.com', 'mohmal.com', 'emailondeck.com', 'burnermail.io', 'spamgourmet.com', 'tempinbox.com', 'moakt.com', 'tmpmail.org', 'tmpmail.net', 'discard.email', 'mailcatch.com',
  'spambox.us', 'incognitomail.com', 'mytemp.email', 'tempr.email', 'inboxkitten.com', 'emailfake.com', 'fakemail.net', 'luxusmail.org'];

// ---------------------------------------------------------------- account emails
// Verification and password-reset emails are sent by the FuzeNova site from its own domain. If that service is
// unavailable, the player still gets Firebase's built-in email, so nobody is locked out.

const mailApi = (): string => (/(^|\.)fuzenova\.dev$/.test(location.hostname) ? '' : 'https://www.fuzenova.dev');

/** Returns true if our service sent it, false if it was unavailable (so the caller can use the built-in email). */
async function viaSite(path: string, body: object, idToken?: string): Promise<boolean> {
  try {
    const r = await fetch(`${mailApi()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
      body: JSON.stringify({ ...body, game: 'cinder-automata' }),
    });
    if (r.status === 429) throw Object.assign(new Error('Please wait a minute before asking for another email.'), { code: 'app/rate-limited' });
    return r.ok;
  } catch (e) {
    if ((e as { code?: string })?.code === 'app/rate-limited') throw e;
    return false; // network trouble or the service is down: fall back
  }
}

async function emailVerificationLink(): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('Not signed in.');
  if (await viaSite('/api/auth/send-verification', {}, await u.getIdToken())) return;
  await u.sendEmailVerification();
}

export function checkEmail(raw: string): { email: string } | { error: string } {
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return { error: 'That email address does not look right.' };
  const domain = email.split('@')[1];
  if (DISPOSABLE.some((d) => domain === d || domain.endsWith('.' + d))) return { error: 'Please use a real email address (throwaway mail services are not allowed).' };
  return { email };
}

export function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email': return 'That email address does not look right.';
    case 'auth/email-already-in-use': return 'An account with that email already exists. Try signing in.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/wrong-password': case 'auth/invalid-credential': case 'auth/user-not-found': return 'Wrong email or password.';
    case 'auth/too-many-requests': return 'Too many tries. Wait a moment and try again.';
    case 'auth/network-request-failed': return 'Network error: check your connection.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    default: return (e as Error)?.message || 'Something went wrong. Try again.';
  }
}

export async function signIn(email: string, password: string): Promise<CloudUser> {
  await loadSdk();
  const cred = await auth.signInWithEmailAndPassword(email.trim(), password);
  user = toUser(cred.user); rememberUser(user);
  return user;
}

export async function createAccount(email: string, password: string, username: string): Promise<CloudUser> {
  const chk = checkUsername(username);
  if ('error' in chk) throw Object.assign(new Error(chk.error), { code: 'app/invalid-username' });
  const em = checkEmail(email);
  if ('error' in em) throw Object.assign(new Error(em.error), { code: 'app/invalid-email' });
  await loadSdk();
  const cred = await auth.createUserWithEmailAndPassword(email.trim(), password);
  await cred.user.updateProfile({ displayName: chk.name });
  try { await cred.user.reload(); } catch { /* the name is set; the reload only refreshes it */ }
  try { await emailVerificationLink(); } catch { /* the verify screen offers to send it again */ }
  user = toUser(auth.currentUser ?? cred.user); rememberUser(user);
  return user;
}

/** Sends the verification link again (or for the first time, for an older account). */
export async function sendVerification(): Promise<void> {
  await loadSdk();
  await emailVerificationLink();
}

/** Asks the account service whether the link has been clicked yet, and refreshes the sign-in token so the save rules see it. */
export async function refreshVerified(): Promise<CloudUser | null> {
  await loadSdk();
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  if (auth.currentUser.emailVerified) await auth.currentUser.getIdToken(true);
  user = toUser(auth.currentUser); rememberUser(user);
  return user;
}

export async function resetPassword(email: string): Promise<void> {
  await loadSdk();
  if (await viaSite('/api/auth/send-reset', { email: email.trim() })) return;
  await auth.sendPasswordResetEmail(email.trim());
}

export async function signOut(): Promise<void> {
  try { await flush(); } catch { /* signing out matters more than a failed last upload */ }
  try { if (auth) await auth.signOut(); } catch { /* fine */ }
  user = null; rememberUser(null);
  clearLocalGameData(); // the next person on this device starts clean
}

// ---------------------------------------------------------------- cloud save

interface CloudDoc { v: 1; run: string | null; runSavedAt: number; level: number; profile: Partial<Record<ProfileName, string>>; savedAt: number; summary: string }

const readLocal = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const writeLocal = (k: string, v: string | null): void => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage blocked */ } };

export function clearLocalGameData(): void {
  writeLocal(SAVE_KEY, null);
  for (const k of Object.values(PROFILE_KEYS)) writeLocal(k, null);
}

function localSavedAt(): number {
  try { return (JSON.parse(readLocal(SAVE_KEY) ?? 'null') as { savedAt?: number } | null)?.savedAt ?? 0; } catch { return 0; }
}

/** Merges two copies of the progress records: unlocks are joined, each commander keeps its best level. */
export function mergeProfile(a: Partial<Record<ProfileName, string>>, b: Partial<Record<ProfileName, string>>): Partial<Record<ProfileName, string>> {
  const parse = <T,>(s: string | undefined, d: T): T => { try { return s ? JSON.parse(s) as T : d; } catch { return d; } };
  const unlocks = [...new Set([...parse<string[]>(a.unlocks, []), ...parse<string[]>(b.unlocks, [])])];
  const progress: Record<string, { best: number }> = { ...parse<Record<string, { best: number }>>(a.progress, {}) };
  for (const [id, v] of Object.entries(parse<Record<string, { best: number }>>(b.progress, {}))) progress[id] = { best: Math.max(progress[id]?.best ?? 0, v.best) };
  const seen = [...new Set([...parse<string[]>(a.seen, []), ...parse<string[]>(b.seen, [])])];
  const base = { earned: 0, levels: {} };
  const prestige = a.prestige !== undefined || b.prestige !== undefined ? { prestige: JSON.stringify(mergePrestige({ ...base, ...parse<Partial<PrestigeState>>(a.prestige, {}) }, { ...base, ...parse<Partial<PrestigeState>>(b.prestige, {}) })) } : {}; // the most Embers earned, the higher level of each perk, every talent either copy unlocked
  return { ...prestige, unlocks: JSON.stringify(unlocks), progress: JSON.stringify(progress), commander: a.commander ?? b.commander, difficulty: a.difficulty ?? b.difficulty, ...(a.seen !== undefined || b.seen !== undefined ? { seen: JSON.stringify(seen) } : {}) };
}

function localProfile(): Partial<Record<ProfileName, string>> {
  const p: Partial<Record<ProfileName, string>> = {};
  for (const n of Object.keys(PROFILE_KEYS) as ProfileName[]) { const v = readLocal(PROFILE_KEYS[n]); if (v !== null) p[n] = v; }
  return p;
}

function summaryOf(): string {
  try { const s = JSON.parse(readLocal(SAVE_KEY) ?? 'null') as { level?: number } | null; return s?.level ? `Level ${s.level}` : 'No run saved'; } catch { return ''; }
}

/** Called right after signing in: brings the account's saved game and progress into this browser (and adopts what the browser already had, the first time). */
export async function pullCloud(): Promise<'cloud' | 'adopted' | 'empty'> {
  if (!user) return 'empty';
  await loadSdk();
  const snap = await db.collection(COLLECTION).doc(user.uid).get();
  const local = { run: readLocal(SAVE_KEY), at: localSavedAt(), profile: localProfile() };
  if (!snap.exists) { // a first sign-in: whatever this browser already holds becomes the account's
    if (local.run || Object.keys(local.profile).length) { dirty = true; await flush(); return 'adopted'; }
    return 'empty';
  }
  const d = snap.data() as CloudDoc;
  lastSent = (d.run ?? '').replace(/"savedAt":\d+/, '') + JSON.stringify(d.profile ?? {}); // what the cloud holds now
  const merged = mergeProfile(d.profile ?? {}, local.profile);
  for (const n of Object.keys(PROFILE_KEYS) as ProfileName[]) writeLocal(PROFILE_KEYS[n], merged[n] ?? null);
  if (d.run && (d.runSavedAt ?? 0) >= local.at) writeLocal(SAVE_KEY, d.run); // the newer run wins
  else if (local.run && local.at > (d.runSavedAt ?? 0)) { dirty = true; await flush(); }
  else if (!d.run && !local.run) writeLocal(SAVE_KEY, null);
  return 'cloud';
}

let dirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;
export type SyncState = 'idle' | 'syncing' | 'saved' | 'error';
let state: SyncState = 'idle';
const listeners = new Set<(s: SyncState) => void>();
export const onSyncState = (f: (s: SyncState) => void): (() => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
const setState = (s: SyncState): void => { state = s; listeners.forEach((f) => f(s)); };
export const syncState = (): SyncState => state;

/** Something the cloud copy should know about has changed in this browser (a save, a new unlock, a star). Uploaded a few seconds later. */
export function markDirty(): void {
  if (!user) return;
  dirty = true;
  // not more than once every 30 seconds however often the game saves locally; the tab closing or signing out uploads at once
  if (!timer) timer = setTimeout(() => { timer = null; void flush().catch(() => { /* shown by the sync state */ }); }, UPLOAD_EVERY_MS);
}

/** Uploads now, if anything changed. */
export async function flush(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!user || !dirty || !db) return;
  dirty = false;
  setState('syncing');
  const run = readLocal(SAVE_KEY);
  const doc: CloudDoc = { v: 1, run, runSavedAt: localSavedAt(), level: 0, profile: localProfile(), savedAt: Date.now(), summary: summaryOf() };
  try { doc.level = (JSON.parse(run ?? 'null') as { level?: number } | null)?.level ?? 0; } catch { /* no run */ }
  const bytes = JSON.stringify(doc).length;
  if (bytes > MAX_BYTES) { setState('error'); throw new Error('This save is too large to upload.'); }
  const fingerprint = (run ?? '').replace(/"savedAt":\d+/, '') + JSON.stringify(doc.profile);
  if (fingerprint === lastSent) { setState('saved'); return; } // nothing has changed since the last upload: no write, no cost
  try {
    await db.collection(COLLECTION).doc(user.uid).set(doc);
    lastSent = fingerprint;
    setState('saved');
  } catch (e) {
    dirty = true; setState('error');
    throw e;
  }
}

// upload when the tab is hidden or closed, so the last build phase is never lost
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.hidden) void flush().catch(() => { /* retried on the next change */ }); });
  window.addEventListener('pagehide', () => { void flush().catch(() => { /* fine */ }); });
}
