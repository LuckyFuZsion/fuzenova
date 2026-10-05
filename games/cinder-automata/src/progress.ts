// What carries over between runs: the furthest level each commander has completed, which gives their stars.
// Stored in this browser only.
import { markDirty } from './cloud';
import { COMMANDERS, starsForLevel } from './sim/commanders';

// ---- commander unlocks: three start unlocked, the rest are earned through achievements (sim/achievements.ts) ----
const UNLOCK_KEY = 'cinder-automata.unlocks.v1';

function loadUnlocked(): string[] {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    const a = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

export function isUnlocked(id: string): boolean {
  const c = COMMANDERS.find((x) => x.id === id);
  return !!c && (!!c.starter || loadUnlocked().includes(id));
}

/** Unlocks a commander; true if it was newly unlocked. */
export function unlockCommander(id: string): boolean {
  if (isUnlocked(id)) return false;
  const list = [...loadUnlocked(), id];
  try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(list)); } catch { /* cannot store: unlocked for this session only */ }
  markDirty();
  return true;
}

// ---- the commander last chosen ----
const CMD_KEY = 'cinder-automata.commander.v1';
export function lastCommander(): string {
  try { return localStorage.getItem(CMD_KEY) ?? ''; } catch { return ''; }
}
export function rememberCommander(id: string): void {
  try { localStorage.setItem(CMD_KEY, id); } catch { /* fine */ }
  markDirty();
}

// ---- the difficulty last chosen ----
const DIFF_KEY = 'cinder-automata.difficulty.v1';
export function lastDifficulty(): string {
  try { return localStorage.getItem(DIFF_KEY) ?? 'normal'; } catch { return 'normal'; }
}
export function rememberDifficulty(id: string): void {
  try { localStorage.setItem(DIFF_KEY, id); } catch { /* fine */ }
  markDirty();
}

const KEY = 'cinder-automata.progress.v1';

export type Progress = Record<string, { best: number }>;

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    const p = raw ? JSON.parse(raw) as Progress : {};
    return p && typeof p === 'object' ? p : {};
  } catch { return {}; }
}

export const bestLevel = (id: string): number => loadProgress()[id]?.best ?? 0;
export const starsFor = (id: string): number => starsForLevel(bestLevel(id));

/** Records a completed level. Returns true if it earned a new star. */
export function recordWin(id: string, level: number): boolean {
  const p = loadProgress();
  const before = starsForLevel(p[id]?.best ?? 0);
  if (level > (p[id]?.best ?? 0)) p[id] = { best: level };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* can't store: the run still plays */ }
  markDirty();
  return starsForLevel(p[id].best) > before;
}
