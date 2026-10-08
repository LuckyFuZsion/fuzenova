// Out-of-game progression. Every run earns Embers according to how far it got (a lost run pays out just the same, since the game is endless),
// and Embers are spent in the Workshop on small permanent buffs that apply to every later run. Pure rules here; storage and screen are elsewhere.
import type { Mods } from './commanders';
import { mergeTalents, talentById, talentSpent } from './talents';

export interface Perk {
  id: string;
  name: string;
  /** what one level does, in words */
  blurb: string;
  max: number;
  /** price of level n+1 is base x (n + 1) */
  base: number;
  /** applies `lvl` levels of this perk to a run's modifiers */
  apply: (m: Mods, lvl: number) => void;
}

const times = (m: Mods, key: 'turretDmg' | 'turretAmmo' | 'defenceHp' | 'coreHp' | 'robotHp' | 'robotDps' | 'coilDmg' | 'startStock', per: number, lvl: number): void => { m[key] *= 1 + per * lvl; };

export const PERKS: Perk[] = [
  { id: 'dmg', name: 'Hardened rounds', blurb: 'Turrets hit 3% harder per level.', max: 10, base: 4, apply: (m, l) => times(m, 'turretDmg', 0.03, l) },
  { id: 'ammo', name: 'Deep magazines', blurb: 'Turrets hold 5% more ammunition per level.', max: 6, base: 3, apply: (m, l) => times(m, 'turretAmmo', 0.05, l) },
  { id: 'plating', name: 'Reinforced plating', blurb: 'Turrets and walls have 4% more health per level.', max: 10, base: 4, apply: (m, l) => times(m, 'defenceHp', 0.04, l) },
  { id: 'core', name: 'Core armour', blurb: 'The Core has 5% more health per level.', max: 10, base: 4, apply: (m, l) => times(m, 'coreHp', 0.05, l) },
  { id: 'hulls', name: 'Robot hulls', blurb: 'Robots have 4% more health per level.', max: 10, base: 4, apply: (m, l) => times(m, 'robotHp', 0.04, l) },
  { id: 'arms', name: 'Robot weapons', blurb: 'Robots hit 3% harder per level.', max: 10, base: 4, apply: (m, l) => times(m, 'robotDps', 0.03, l) },
  { id: 'assembly', name: 'Quick assembly', blurb: 'Robots build 3% faster per level.', max: 8, base: 4, apply: (m, l) => { m.smallBuildTime *= 1 - 0.03 * l; m.bigBuildTime *= 1 - 0.03 * l; } },
  { id: 'coils', name: 'Coil capacitors', blurb: 'Storm coils hit 4% harder per level.', max: 8, base: 4, apply: (m, l) => times(m, 'coilDmg', 0.04, l) },
  { id: 'supplies', name: 'Supply drop', blurb: 'Each run starts with 5% more plates per level.', max: 10, base: 3, apply: (m, l) => times(m, 'startStock', 0.05, l) },
  { id: 'survey', name: 'Surveyor', blurb: 'One more map square to choose from after each level.', max: 1, base: 40, apply: (m, l) => { m.moduleChoices += l; } },
];

export interface PrestigeState {
  /** every Ember ever earned: the balance is this minus what the owned levels cost */
  earned: number;
  levels: Record<string, number>;
  /** talents bought with Embers, and the talents set on each commander (see talents.ts) */
  unlocked?: string[];
  loadout?: Record<string, string[]>;
  /** the ledger: what was earned and spent since it was added, newest last (older play is just in `earned`) */
  log?: LedgerEntry[];
}

/** One line of the Embers ledger: when (ms since 1970), how many (negative = spent) and why. */
export interface LedgerEntry { t: number; n: number; why: string }
export const LEDGER_MAX = 200;
const entryKey = (e: LedgerEntry): string => `${e.t}|${e.n}|${e.why}`;

/** The state with a ledger line added (the oldest lines drop off past LEDGER_MAX). */
export function withEntry(s: PrestigeState, e: LedgerEntry): PrestigeState {
  return { ...s, log: [...(s.log ?? []), e].slice(-LEDGER_MAX) };
}

export interface SpentLine { label: string; embers: number }
/** Everything the ledger can say: totals, what has been bought (worked out from the levels, so it is complete even for play before the ledger), and the history. */
export function ledgerView(s: PrestigeState): { earned: number; spent: number; balance: number; before: number; spentOn: SpentLine[]; rows: LedgerEntry[] } {
  const log = s.log ?? [];
  const logged = log.reduce((n, e) => n + (e.n > 0 ? e.n : 0), 0);
  const spentOn: SpentLine[] = [];
  for (const p of PERKS) { const l = Math.min(p.max, s.levels[p.id] ?? 0); if (l > 0) spentOn.push({ label: `${p.name} (level ${l})`, embers: totalCost(p, l) }); }
  for (const id of s.unlocked ?? []) { const t = talentById(id); if (t) spentOn.push({ label: `Talent: ${t.name}`, embers: t.cost }); }
  return { earned: s.earned, spent: spent(s), balance: balance(s), before: Math.max(0, s.earned - logged), spentOn, rows: [...log].reverse() };
}
export const EMPTY_PRESTIGE: PrestigeState = { earned: 0, levels: {} };

export const perkById = (id: string): Perk | undefined => PERKS.find((p) => p.id === id);
/** Embers for the next level of a perk (Infinity once it is at its maximum). */
export const nextCost = (p: Perk, lvl: number): number => (lvl >= p.max ? Infinity : p.base * (lvl + 1));
const totalCost = (p: Perk, lvl: number): number => { let n = 0; for (let i = 0; i < lvl; i++) n += p.base * (i + 1); return n; };
export const spent = (s: PrestigeState): number => PERKS.reduce((n, p) => n + totalCost(p, Math.min(p.max, s.levels[p.id] ?? 0)), 0) + talentSpent({ unlocked: s.unlocked ?? [], loadout: {} });
export const balance = (s: PrestigeState): number => Math.max(0, s.earned - spent(s));

/** Buys one level of a perk: returns the new state, or null if it cannot be bought (maxed, or not enough Embers). */
export function buy(s: PrestigeState, id: string): PrestigeState | null {
  const p = perkById(id);
  if (!p) return null;
  const lvl = s.levels[id] ?? 0, cost = nextCost(p, lvl);
  if (lvl >= p.max || balance(s) < cost) return null;
  return { ...s, levels: { ...s.levels, [id]: lvl + 1 } };
}

/** A run's modifiers with every owned perk applied (the commander's own bonuses are already in `mods`). */
export function applyPerks(mods: Mods, s: PrestigeState): Mods {
  const m: Mods = { ...mods };
  for (const p of PERKS) { const l = Math.min(p.max, s.levels[p.id] ?? 0); if (l > 0) p.apply(m, l); }
  return m;
}

/** How much a level counts for: harder difficulties pay more. */
export const DIFFICULTY_PAY: Record<string, number> = { easy: 0.75, normal: 1, hard: 1.25, extreme: 1.5 };
/** Embers for finishing `done` levels: 1 each for the first three, 2 for the next three, and so on, so deeper levels are worth more. */
export function emberReward(done: number, difficulty = 'normal'): number {
  let n = 0;
  for (let l = 1; l <= done; l++) n += Math.ceil(l / 3);
  return Math.round(n * (DIFFICULTY_PAY[difficulty] ?? 1));
}

/** Joins two copies of the same player's progress (two devices): the most Embers earned, and the higher level of each perk. */
export function mergePrestige(a: PrestigeState, b: PrestigeState): PrestigeState {
  const levels: Record<string, number> = { ...a.levels };
  for (const [k, v] of Object.entries(b.levels)) levels[k] = Math.max(levels[k] ?? 0, v);
  const t = mergeTalents({ unlocked: a.unlocked ?? [], loadout: a.loadout ?? {} }, { unlocked: b.unlocked ?? [], loadout: b.loadout ?? {} });
  const seen = new Set<string>(), log: LedgerEntry[] = []; // the two ledgers joined, each line once
  for (const e of [...(a.log ?? []), ...(b.log ?? [])]) { const k = entryKey(e); if (!seen.has(k)) { seen.add(k); log.push(e); } }
  log.sort((x, y) => x.t - y.t);
  return { earned: Math.max(a.earned, b.earned), levels, unlocked: t.unlocked, loadout: t.loadout, log: log.slice(-LEDGER_MAX) };
}
